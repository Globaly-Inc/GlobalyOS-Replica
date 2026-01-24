-- =====================================================
-- Phase 1: Backfill leave_balance_logs with office_leave_type_id
-- =====================================================

-- Step 1: Update logs that have a linked leave_request
UPDATE leave_balance_logs lbl
SET office_leave_type_id = lr.office_leave_type_id
FROM leave_requests lr
WHERE lbl.leave_request_id = lr.id
  AND lbl.office_leave_type_id IS NULL
  AND lr.office_leave_type_id IS NOT NULL;

-- Step 2: Update logs without request linkage - derive from employee's current office
UPDATE leave_balance_logs
SET office_leave_type_id = subq.olt_id
FROM (
  SELECT lbl.id AS log_id, olt.id AS olt_id
  FROM leave_balance_logs lbl
  JOIN employees e ON e.id = lbl.employee_id
  JOIN office_leave_types olt ON olt.office_id = e.office_id 
    AND LOWER(olt.name) = LOWER(lbl.leave_type)
  WHERE lbl.office_leave_type_id IS NULL
    AND olt.is_active = true
) subq
WHERE leave_balance_logs.id = subq.log_id;

-- =====================================================
-- Phase 2: Update handle_leave_request_balance trigger
-- to populate office_leave_type_id in log entries
-- =====================================================

CREATE OR REPLACE FUNCTION handle_leave_request_balance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id UUID;
  v_year INT;
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
  v_office_leave_type_id UUID;
  v_balance_id UUID;
BEGIN
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  v_year := EXTRACT(YEAR FROM COALESCE(NEW.start_date, OLD.start_date)::DATE);

  -- CASE 1: Request approved (deduct balance)
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    v_office_leave_type_id := NEW.office_leave_type_id;
    
    SELECT id, COALESCE(balance, 0)
    INTO v_balance_id, v_old_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND year = v_year
      AND office_leave_type_id = v_office_leave_type_id
    LIMIT 1;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    v_new_balance := v_old_balance - NEW.days_count;
    
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, 
      office_leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type,
      v_office_leave_type_id,
      -NEW.days_count, v_old_balance, v_new_balance,
      'Leave approved: ' || NEW.leave_type,
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_approved', v_year
    );
    
    RETURN NEW;
  END IF;

  -- CASE 2: Request rejected (no balance change, just log)
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    v_office_leave_type_id := NEW.office_leave_type_id;
    
    SELECT COALESCE(balance, 0)
    INTO v_old_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND year = v_year
      AND office_leave_type_id = v_office_leave_type_id
    LIMIT 1;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type,
      office_leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type,
      v_office_leave_type_id,
      0, v_old_balance, v_old_balance,
      'Leave rejected: ' || NEW.leave_type,
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_rejected', v_year
    );
    
    RETURN NEW;
  END IF;

  -- CASE 3: Approved request cancelled (restore balance)
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
    v_office_leave_type_id := NEW.office_leave_type_id;
    
    SELECT COALESCE(balance, 0)
    INTO v_old_balance
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND year = v_year
      AND office_leave_type_id = v_office_leave_type_id
    LIMIT 1;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    v_new_balance := v_old_balance + OLD.days_count;
    
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type,
      office_leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type,
      v_office_leave_type_id,
      OLD.days_count, v_old_balance, v_new_balance,
      'Leave cancelled - balance restored: ' || NEW.leave_type,
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_cancelled', v_year
    );
    
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- Phase 3: Update sync_balance_from_log trigger
-- to use ONLY office_leave_type_id (remove legacy fallback)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_balance_from_log()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INT;
BEGIN
  v_year := COALESCE(NEW.year, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
  
  -- ONLY use office_leave_type_id - no legacy fallback
  IF NEW.office_leave_type_id IS NOT NULL THEN
    INSERT INTO leave_type_balances (
      employee_id,
      office_leave_type_id,
      organization_id,
      balance,
      year
    )
    VALUES (
      NEW.employee_id,
      NEW.office_leave_type_id,
      NEW.organization_id,
      NEW.new_balance,
      v_year
    )
    ON CONFLICT (employee_id, office_leave_type_id, year)
    DO UPDATE SET 
      balance = EXCLUDED.balance,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;