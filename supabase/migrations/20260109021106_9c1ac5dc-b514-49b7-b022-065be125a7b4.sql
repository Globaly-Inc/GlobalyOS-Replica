-- =============================================
-- Comprehensive Leave Balance System Update
-- 1. Enable realtime for leave tables
-- 2. Add CASE 4 to handle leave type changes
-- 3. Fix existing data mismatches
-- =============================================

-- Part 1: Enable Realtime for leave tables
ALTER TABLE public.leave_type_balances REPLICA IDENTITY FULL;
ALTER TABLE public.leave_balance_logs REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_type_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_balance_logs;

-- Part 2: Update the handle_leave_request_balance function to include CASE 4
CREATE OR REPLACE FUNCTION public.handle_leave_request_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_year INT;
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
  v_old_type_balance NUMERIC;
  v_new_type_balance NUMERIC;
BEGIN
  -- Get organization ID
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  
  -- Calculate year from request start date
  v_year := EXTRACT(YEAR FROM COALESCE(NEW.start_date, OLD.start_date)::DATE);

  -- CASE 1: Request approved (deduct balance)
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Get current balance for the leave type
    SELECT COALESCE(balance, 0) INTO v_old_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = v_year;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    v_new_balance := v_old_balance - NEW.days_count;
    
    -- Insert log entry for leave approval (deduction)
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type, NEW.leave_type_id,
      -NEW.days_count, v_old_balance, v_new_balance,
      'Leave request approved: ' || NEW.leave_type || ' (' || NEW.start_date || ' to ' || NEW.end_date || ')',
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_approved', v_year
    );
    
    RETURN NEW;
  END IF;

  -- CASE 2: Approved request rejected or cancelled (refund balance)
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status IN ('rejected', 'cancelled') THEN
    -- Get current balance for the leave type
    SELECT COALESCE(balance, 0) INTO v_old_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = OLD.leave_type_id
      AND year = v_year;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    v_new_balance := v_old_balance + OLD.days_count;
    
    -- Insert log entry for refund
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, OLD.leave_type, OLD.leave_type_id,
      OLD.days_count, v_old_balance, v_new_balance,
      'Leave request ' || NEW.status || ': ' || OLD.leave_type || ' (' || OLD.start_date || ' to ' || OLD.end_date || ')',
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_refund', v_year
    );
    
    RETURN NEW;
  END IF;

  -- CASE 3: Approved request days modified (adjust balance)
  IF TG_OP = 'UPDATE' 
     AND OLD.status = 'approved' 
     AND NEW.status = 'approved'
     AND OLD.leave_type_id = NEW.leave_type_id
     AND OLD.days_count != NEW.days_count THEN
    
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO v_old_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = v_year;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    -- Refund old days, deduct new days
    v_new_balance := v_old_balance + OLD.days_count - NEW.days_count;
    
    -- Insert log entry for modification
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type, NEW.leave_type_id,
      (OLD.days_count - NEW.days_count), v_old_balance, v_new_balance,
      'Leave request modified: ' || OLD.days_count || ' days -> ' || NEW.days_count || ' days',
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_modify', v_year
    );
    
    RETURN NEW;
  END IF;

  -- CASE 4: Leave type changed on approved request (refund old, deduct new)
  IF TG_OP = 'UPDATE' 
     AND OLD.status = 'approved' 
     AND NEW.status = 'approved'
     AND OLD.leave_type_id IS DISTINCT FROM NEW.leave_type_id THEN
    
    -- Get current balance for OLD leave type
    SELECT COALESCE(balance, 0) INTO v_old_type_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = OLD.leave_type_id
      AND year = v_year;
    
    v_old_type_balance := COALESCE(v_old_type_balance, 0);
    
    -- Get current balance for NEW leave type
    SELECT COALESCE(balance, 0) INTO v_new_type_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = v_year;
    
    v_new_type_balance := COALESCE(v_new_type_balance, 0);
    
    -- Insert refund log for OLD leave type
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, OLD.leave_type, OLD.leave_type_id,
      OLD.days_count, v_old_type_balance, v_old_type_balance + OLD.days_count,
      'Leave type changed from ' || OLD.leave_type || ' to ' || NEW.leave_type,
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_type_change_refund', v_year
    );
    
    -- Insert deduction log for NEW leave type
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type, NEW.leave_type_id,
      -NEW.days_count, v_new_type_balance, v_new_type_balance - NEW.days_count,
      'Leave type changed from ' || OLD.leave_type || ' to ' || NEW.leave_type,
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_type_change_deduct', v_year
    );
    
    RETURN NEW;
  END IF;

  -- CASE 5: Approved request deleted (refund balance)
  IF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    -- Get current balance for the leave type
    SELECT COALESCE(balance, 0) INTO v_old_balance
    FROM leave_type_balances
    WHERE employee_id = OLD.employee_id
      AND leave_type_id = OLD.leave_type_id
      AND year = v_year;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    v_new_balance := v_old_balance + OLD.days_count;
    
    -- Insert log entry for delete refund
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      OLD.employee_id, v_org_id, OLD.leave_type, OLD.leave_type_id,
      OLD.days_count, v_old_balance, v_new_balance,
      'Leave request deleted: ' || OLD.leave_type || ' (' || OLD.start_date || ' to ' || OLD.end_date || ')',
      OLD.employee_id, OLD.id, 'leave_delete_refund', v_year
    );
    
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Part 3: Fix existing data - Update leave_requests where leave_type_id doesn't match
UPDATE leave_requests lr
SET leave_type_id = lt.id
FROM leave_types lt
WHERE lr.leave_type = lt.name
  AND lr.organization_id = lt.organization_id
  AND (lr.leave_type_id IS NULL OR lr.leave_type_id != lt.id);

-- Part 4: Recalculate balances from logs for 2025-2026
WITH log_totals AS (
  SELECT 
    employee_id, 
    leave_type_id, 
    year,
    SUM(change_amount) as correct_balance
  FROM leave_balance_logs
  WHERE leave_type_id IS NOT NULL 
    AND year IS NOT NULL
    AND year >= 2025
  GROUP BY employee_id, leave_type_id, year
)
UPDATE leave_type_balances ltb
SET balance = lt.correct_balance, updated_at = now()
FROM log_totals lt
WHERE ltb.employee_id = lt.employee_id
  AND ltb.leave_type_id = lt.leave_type_id
  AND ltb.year = lt.year
  AND ltb.balance != lt.correct_balance;