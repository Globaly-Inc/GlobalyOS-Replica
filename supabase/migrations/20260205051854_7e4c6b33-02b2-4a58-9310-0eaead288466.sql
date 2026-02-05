-- Remove legacy leave_type_id references from trigger functions
-- Update to use office_leave_type_id exclusively

-- 1. Fix handle_leave_request_approval - remove legacy fallback
CREATE OR REPLACE FUNCTION public.handle_leave_request_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_leave_type_id UUID;
  v_days_count NUMERIC;
  v_employee_id UUID;
  v_organization_id UUID;
  v_leave_type_name TEXT;
  v_year INT;
  v_current_balance NUMERIC;
BEGIN
  -- Only trigger on status change to 'approved'
  IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN
    v_employee_id := NEW.employee_id;
    v_organization_id := NEW.organization_id;
    v_days_count := NEW.days_count;
    v_leave_type_name := NEW.leave_type;
    v_year := EXTRACT(YEAR FROM NEW.start_date)::INT;
    
    -- Get the office_leave_type_id from the leave request
    v_office_leave_type_id := NEW.office_leave_type_id;
    
    -- If no office_leave_type_id, skip balance deduction gracefully
    IF v_office_leave_type_id IS NULL THEN
      RAISE NOTICE 'No office_leave_type_id on leave request %, skipping balance deduction', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM leave_type_balances
    WHERE employee_id = v_employee_id
      AND office_leave_type_id = v_office_leave_type_id
      AND year = v_year;
    
    v_current_balance := COALESCE(v_current_balance, 0);
    
    -- Insert log entry to deduct balance (sync_balance_from_log trigger will update actual balance)
    INSERT INTO leave_balance_logs (
      employee_id,
      organization_id,
      office_leave_type_id,
      leave_type,
      change_amount,
      previous_balance,
      new_balance,
      reason,
      created_by,
      effective_date,
      action,
      year
    ) VALUES (
      v_employee_id,
      v_organization_id,
      v_office_leave_type_id,
      v_leave_type_name,
      -v_days_count,  -- Negative to deduct
      v_current_balance,
      v_current_balance - v_days_count,
      'Leave approved: ' || v_leave_type_name,
      COALESCE(NEW.reviewed_by, v_employee_id),
      NEW.start_date,
      'leave_approval_deduction',
      v_year
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Fix handle_leave_proration_on_offboarding - use office_leave_types
CREATE OR REPLACE FUNCTION public.handle_leave_proration_on_offboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leave_type RECORD;
  v_resignation_date DATE;
  v_year INT;
  v_days_worked INT;
  v_total_days_in_year INT;
  v_prorated_days NUMERIC;
  v_days_to_deduct NUMERIC;
BEGIN
  -- Only process when resignation_date is set or changed
  IF (TG_OP = 'UPDATE' AND NEW.resignation_date IS NOT NULL AND 
      (OLD.resignation_date IS NULL OR OLD.resignation_date != NEW.resignation_date)) THEN
    
    v_resignation_date := NEW.resignation_date;
    v_year := EXTRACT(YEAR FROM v_resignation_date)::INT;
    
    -- Calculate days worked in the year
    v_days_worked := EXTRACT(DOY FROM v_resignation_date)::INT;
    v_total_days_in_year := CASE WHEN EXTRACT(YEAR FROM v_resignation_date)::INT % 4 = 0 THEN 366 ELSE 365 END;
    
    -- Process each leave balance for this employee using office_leave_types
    FOR v_leave_type IN 
      SELECT ltb.id, ltb.office_leave_type_id, ltb.balance, olt.default_days, olt.name
      FROM leave_type_balances ltb
      JOIN office_leave_types olt ON olt.id = ltb.office_leave_type_id
      WHERE ltb.employee_id = NEW.id 
        AND ltb.year = v_year
        AND olt.is_active = true
    LOOP
      -- Calculate prorated entitlement
      v_prorated_days := ROUND((COALESCE(v_leave_type.default_days, 0)::NUMERIC * v_days_worked / v_total_days_in_year), 2);
      
      -- If current balance exceeds prorated entitlement, deduct the excess
      IF v_leave_type.balance > v_prorated_days THEN
        v_days_to_deduct := v_leave_type.balance - v_prorated_days;
        
        -- Insert log entry for proration adjustment
        INSERT INTO leave_balance_logs (
          employee_id,
          organization_id,
          office_leave_type_id,
          leave_type,
          change_amount,
          previous_balance,
          new_balance,
          reason,
          created_by,
          effective_date,
          action,
          year
        ) VALUES (
          NEW.id,
          NEW.organization_id,
          v_leave_type.office_leave_type_id,
          v_leave_type.name,
          -v_days_to_deduct,
          v_leave_type.balance,
          v_prorated_days,
          'Leave proration on offboarding (resignation date: ' || v_resignation_date || ')',
          NEW.id,
          v_resignation_date,
          'offboarding_proration',
          v_year
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block the employee update
    RAISE NOTICE 'Leave proration error for employee %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Fix handle_leave_request_cancellation - remove legacy fallback
CREATE OR REPLACE FUNCTION public.handle_leave_request_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_leave_type_id UUID;
  v_days_count NUMERIC;
  v_employee_id UUID;
  v_organization_id UUID;
  v_leave_type_name TEXT;
  v_year INT;
  v_current_balance NUMERIC;
BEGIN
  -- Only trigger when status changes to 'cancelled' from 'approved'
  IF (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status = 'cancelled') THEN
    v_employee_id := NEW.employee_id;
    v_organization_id := NEW.organization_id;
    v_days_count := NEW.days_count;
    v_leave_type_name := NEW.leave_type;
    v_year := EXTRACT(YEAR FROM NEW.start_date)::INT;
    
    -- Get the office_leave_type_id from the leave request
    v_office_leave_type_id := NEW.office_leave_type_id;
    
    -- If no office_leave_type_id, skip balance restoration gracefully
    IF v_office_leave_type_id IS NULL THEN
      RAISE NOTICE 'No office_leave_type_id on leave request %, skipping balance restoration', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM leave_type_balances
    WHERE employee_id = v_employee_id
      AND office_leave_type_id = v_office_leave_type_id
      AND year = v_year;
    
    v_current_balance := COALESCE(v_current_balance, 0);
    
    -- Insert log entry to restore balance (sync_balance_from_log trigger will update actual balance)
    INSERT INTO leave_balance_logs (
      employee_id,
      organization_id,
      office_leave_type_id,
      leave_type,
      change_amount,
      previous_balance,
      new_balance,
      reason,
      created_by,
      effective_date,
      action,
      year
    ) VALUES (
      v_employee_id,
      v_organization_id,
      v_office_leave_type_id,
      v_leave_type_name,
      v_days_count,  -- Positive to restore
      v_current_balance,
      v_current_balance + v_days_count,
      'Leave cancelled - balance restored',
      v_employee_id,
      NEW.start_date,
      'leave_cancellation_refund',
      v_year
    );
  END IF;
  
  RETURN NEW;
END;
$$;