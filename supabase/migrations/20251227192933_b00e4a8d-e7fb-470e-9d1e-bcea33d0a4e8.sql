
-- ============================================================
-- COMPREHENSIVE LEAVE BALANCE CONSISTENCY FIX
-- ============================================================
-- This migration ensures leave_type_balances is the authoritative 
-- source of truth for balance lookups, synced via triggers.
-- ============================================================

-- Step 1: Add leave_type_id to leave_requests (for proper FK reference)
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS leave_type_id uuid REFERENCES public.leave_types(id);

-- Step 2: Add columns to leave_balance_logs for tracking
ALTER TABLE public.leave_balance_logs 
ADD COLUMN IF NOT EXISTS leave_type_id uuid REFERENCES public.leave_types(id);

ALTER TABLE public.leave_balance_logs 
ADD COLUMN IF NOT EXISTS leave_request_id uuid REFERENCES public.leave_requests(id);

ALTER TABLE public.leave_balance_logs 
ADD COLUMN IF NOT EXISTS action text DEFAULT 'manual_adjustment';

ALTER TABLE public.leave_balance_logs 
ADD COLUMN IF NOT EXISTS year integer;

-- Step 3: Create unique index to prevent duplicate leave deductions
CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_balance_logs_request_action 
ON public.leave_balance_logs(leave_request_id, action) 
WHERE leave_request_id IS NOT NULL;

-- Step 4: Create function to update leave_type_balances when logs are inserted
CREATE OR REPLACE FUNCTION public.sync_balance_from_log()
RETURNS TRIGGER AS $$
DECLARE
  v_year integer;
  v_org_id uuid;
BEGIN
  -- Determine year from effective_date or created_at
  v_year := COALESCE(NEW.year, EXTRACT(YEAR FROM COALESCE(NEW.effective_date, NEW.created_at))::integer);
  
  -- Get organization_id from the employee
  SELECT organization_id INTO v_org_id 
  FROM employees 
  WHERE id = NEW.employee_id;
  
  -- Upsert the balance
  INSERT INTO leave_type_balances (employee_id, leave_type_id, organization_id, balance, year)
  VALUES (NEW.employee_id, NEW.leave_type_id, v_org_id, NEW.change_amount, v_year)
  ON CONFLICT (employee_id, leave_type_id, year) 
  DO UPDATE SET 
    balance = leave_type_balances.balance + NEW.change_amount,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Create trigger on leave_balance_logs
DROP TRIGGER IF EXISTS trg_sync_balance_from_log ON public.leave_balance_logs;
CREATE TRIGGER trg_sync_balance_from_log
AFTER INSERT ON public.leave_balance_logs
FOR EACH ROW
WHEN (NEW.leave_type_id IS NOT NULL)
EXECUTE FUNCTION public.sync_balance_from_log();

-- Step 6: Create function to handle leave request status changes
CREATE OR REPLACE FUNCTION public.handle_leave_request_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_leave_type_id uuid;
  v_org_id uuid;
  v_year integer;
  v_current_balance numeric;
  v_max_negative numeric;
  v_employee_name text;
BEGIN
  -- Get the leave_type_id
  v_leave_type_id := COALESCE(NEW.leave_type_id, (
    SELECT id FROM leave_types 
    WHERE name = NEW.leave_type 
    AND organization_id = NEW.organization_id 
    LIMIT 1
  ));
  
  -- If we still don't have a leave_type_id, skip
  IF v_leave_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Update the leave_type_id on the request if not set
  IF NEW.leave_type_id IS NULL THEN
    NEW.leave_type_id := v_leave_type_id;
  END IF;
  
  v_year := EXTRACT(YEAR FROM NEW.start_date)::integer;
  v_org_id := NEW.organization_id;
  
  -- CASE 1: New request being approved
  IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
     (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
    
    -- Check current balance and max_negative
    SELECT COALESCE(balance, 0) INTO v_current_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
    AND leave_type_id = v_leave_type_id
    AND year = v_year;
    
    v_current_balance := COALESCE(v_current_balance, 0);
    
    SELECT COALESCE(max_negative_days, 0) INTO v_max_negative
    FROM leave_types WHERE id = v_leave_type_id;
    
    -- Enforce max_negative_days limit
    IF (v_current_balance - NEW.days_count) < (-1 * COALESCE(v_max_negative, 0)) THEN
      SELECT p.full_name INTO v_employee_name
      FROM employees e
      JOIN profiles p ON p.id = e.user_id
      WHERE e.id = NEW.employee_id;
      
      RAISE EXCEPTION 'Insufficient leave balance for %. Current balance: %, Requested: %, Max negative allowed: %', 
        v_employee_name, v_current_balance, NEW.days_count, v_max_negative;
    END IF;
    
    -- Insert deduction log (the trigger will update balances)
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id, 
      change_amount, previous_balance, new_balance, 
      reason, created_by, leave_request_id, action, year
    )
    VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type, v_leave_type_id,
      -NEW.days_count, v_current_balance, v_current_balance - NEW.days_count,
      'Leave approved: ' || NEW.leave_type || ' (' || NEW.start_date || ' to ' || NEW.end_date || ')',
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_deduct', v_year
    )
    ON CONFLICT (leave_request_id, action) DO NOTHING;
  END IF;
  
  -- CASE 2: Approved request being cancelled/rejected
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status IN ('rejected', 'cancelled') THEN
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO v_current_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
    AND leave_type_id = v_leave_type_id
    AND year = v_year;
    
    v_current_balance := COALESCE(v_current_balance, 0);
    
    -- Insert refund log
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    )
    VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type, v_leave_type_id,
      NEW.days_count, v_current_balance, v_current_balance + NEW.days_count,
      'Leave cancelled/rejected: ' || NEW.leave_type || ' (' || NEW.start_date || ' to ' || NEW.end_date || ')',
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_refund', v_year
    )
    ON CONFLICT (leave_request_id, action) DO NOTHING;
  END IF;
  
  -- CASE 3: Approved request days being modified
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status = 'approved' 
     AND OLD.days_count != NEW.days_count THEN
    
    SELECT COALESCE(balance, 0) INTO v_current_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
    AND leave_type_id = v_leave_type_id
    AND year = v_year;
    
    v_current_balance := COALESCE(v_current_balance, 0);
    
    -- Calculate the delta and apply
    DECLARE
      v_delta numeric := OLD.days_count - NEW.days_count; -- positive if reducing days
    BEGIN
      INSERT INTO leave_balance_logs (
        employee_id, organization_id, leave_type, leave_type_id,
        change_amount, previous_balance, new_balance,
        reason, created_by, leave_request_id, action, year
      )
      VALUES (
        NEW.employee_id, v_org_id, NEW.leave_type, v_leave_type_id,
        v_delta, v_current_balance, v_current_balance + v_delta,
        'Leave modified: ' || NEW.leave_type || ' (days changed from ' || OLD.days_count || ' to ' || NEW.days_count || ')',
        COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_modify', v_year
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 7: Create trigger on leave_requests
DROP TRIGGER IF EXISTS trg_handle_leave_request_balance ON public.leave_requests;
CREATE TRIGGER trg_handle_leave_request_balance
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_leave_request_balance();

-- Step 8: Backfill leave_type_id in leave_requests
UPDATE leave_requests lr
SET leave_type_id = lt.id
FROM leave_types lt
WHERE lr.leave_type = lt.name
AND lr.organization_id = lt.organization_id
AND lr.leave_type_id IS NULL;

-- Step 9: Backfill leave_type_id and year in leave_balance_logs
UPDATE leave_balance_logs lbl
SET 
  leave_type_id = lt.id,
  year = COALESCE(lbl.year, EXTRACT(YEAR FROM COALESCE(lbl.effective_date, lbl.created_at))::integer)
FROM leave_types lt, employees e
WHERE lbl.leave_type = lt.name
AND lbl.employee_id = e.id
AND e.organization_id = lt.organization_id
AND lbl.leave_type_id IS NULL;

-- Step 10: Recompute balances from the logs (opening balances)
-- First, clear and recompute from logs
WITH log_totals AS (
  SELECT 
    employee_id,
    leave_type_id,
    year,
    SUM(change_amount) as total_change
  FROM leave_balance_logs
  WHERE leave_type_id IS NOT NULL AND year IS NOT NULL
  GROUP BY employee_id, leave_type_id, year
)
UPDATE leave_type_balances ltb
SET balance = COALESCE(lt.total_change, 0)
FROM log_totals lt
WHERE ltb.employee_id = lt.employee_id
AND ltb.leave_type_id = lt.leave_type_id
AND ltb.year = lt.year;

-- Step 11: Deduct approved leaves that don't have corresponding logs
-- Insert missing deduction logs for approved leave requests
INSERT INTO leave_balance_logs (
  employee_id, organization_id, leave_type, leave_type_id,
  change_amount, previous_balance, new_balance,
  reason, created_by, leave_request_id, action, year, effective_date
)
SELECT 
  lr.employee_id,
  lr.organization_id,
  lr.leave_type,
  lr.leave_type_id,
  -lr.days_count as change_amount,
  0 as previous_balance, -- Will be corrected by final recompute
  -lr.days_count as new_balance,
  'Leave approved (backfilled): ' || lr.leave_type || ' (' || lr.start_date || ' to ' || lr.end_date || ')',
  COALESCE(lr.reviewed_by, lr.employee_id),
  lr.id,
  'leave_deduct',
  EXTRACT(YEAR FROM lr.start_date)::integer,
  lr.start_date
FROM leave_requests lr
WHERE lr.status = 'approved'
AND lr.leave_type_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM leave_balance_logs lbl 
  WHERE lbl.leave_request_id = lr.id 
  AND lbl.action = 'leave_deduct'
);

-- Step 12: Final recompute of all balances from logs
WITH log_totals AS (
  SELECT 
    employee_id,
    leave_type_id,
    year,
    SUM(change_amount) as total_change
  FROM leave_balance_logs
  WHERE leave_type_id IS NOT NULL AND year IS NOT NULL
  GROUP BY employee_id, leave_type_id, year
)
UPDATE leave_type_balances ltb
SET 
  balance = lt.total_change,
  updated_at = now()
FROM log_totals lt
WHERE ltb.employee_id = lt.employee_id
AND ltb.leave_type_id = lt.leave_type_id
AND ltb.year = lt.year;

-- Step 13: Insert any missing balance records for employees with logs but no balance record
INSERT INTO leave_type_balances (employee_id, leave_type_id, organization_id, balance, year)
SELECT 
  lbl.employee_id,
  lbl.leave_type_id,
  e.organization_id,
  SUM(lbl.change_amount),
  lbl.year
FROM leave_balance_logs lbl
JOIN employees e ON e.id = lbl.employee_id
WHERE lbl.leave_type_id IS NOT NULL 
AND lbl.year IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM leave_type_balances ltb
  WHERE ltb.employee_id = lbl.employee_id
  AND ltb.leave_type_id = lbl.leave_type_id
  AND ltb.year = lbl.year
)
GROUP BY lbl.employee_id, lbl.leave_type_id, e.organization_id, lbl.year;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_balance_logs_employee_type_year 
ON public.leave_balance_logs(employee_id, leave_type_id, year);

CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id 
ON public.leave_requests(leave_type_id);
