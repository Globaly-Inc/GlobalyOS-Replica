-- Fix handle_leave_request_delete to use office_leave_type_id instead of legacy leave_type_id
CREATE OR REPLACE FUNCTION public.handle_leave_request_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_leave_type_id UUID;
  v_year INT;
  v_current_balance NUMERIC;
  v_employee_id UUID;
  v_organization_id UUID;
  v_days_count NUMERIC;
  v_leave_type_name TEXT;
BEGIN
  -- Only process if the leave was approved (need to refund balance)
  IF OLD.status = 'approved' THEN
    -- Get the office_leave_type_id from the leave request
    v_office_leave_type_id := OLD.office_leave_type_id;
    
    -- If no office_leave_type_id, skip balance refund (graceful handling for legacy data)
    IF v_office_leave_type_id IS NULL THEN
      RETURN OLD;
    END IF;
    
    v_employee_id := OLD.employee_id;
    v_organization_id := OLD.organization_id;
    v_days_count := OLD.days_count;
    v_year := EXTRACT(YEAR FROM OLD.start_date)::INT;
    
    -- Get the leave type name for logging
    SELECT name INTO v_leave_type_name
    FROM office_leave_types
    WHERE id = v_office_leave_type_id;
    
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM leave_type_balances
    WHERE employee_id = v_employee_id
      AND office_leave_type_id = v_office_leave_type_id
      AND year = v_year;
    
    -- Default to 0 if no balance found
    v_current_balance := COALESCE(v_current_balance, 0);
    
    -- Insert refund log entry (sync_balance_from_log trigger will update actual balance)
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
      COALESCE(v_leave_type_name, OLD.leave_type),
      v_days_count,  -- Positive amount to refund
      v_current_balance,
      v_current_balance + v_days_count,
      'Leave request deleted - balance refunded',
      v_employee_id,  -- Use employee as creator since we don't have the deleting user context
      OLD.start_date,
      'leave_deletion_refund',
      v_year
    );
  END IF;
  
  RETURN OLD;
END;
$$;