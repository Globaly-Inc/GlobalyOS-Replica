-- Fix handle_leave_request_delete to use employee_id instead of auth.uid() for created_by
CREATE OR REPLACE FUNCTION public.handle_leave_request_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_leave_type_id uuid;
  v_year integer;
  v_current_balance numeric;
  v_actor_employee_id uuid;
BEGIN
  -- Only process if the leave was approved
  IF OLD.status != 'approved' THEN
    RETURN OLD;
  END IF;

  -- Get leave_type_id
  v_leave_type_id := COALESCE(OLD.leave_type_id, (
    SELECT id FROM leave_types 
    WHERE name = OLD.leave_type 
    AND organization_id = OLD.organization_id 
    LIMIT 1
  ));

  -- If no leave_type_id found, skip balance refund
  IF v_leave_type_id IS NULL THEN
    RETURN OLD;
  END IF;

  v_year := EXTRACT(YEAR FROM OLD.start_date)::integer;

  -- Get current balance
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM leave_type_balances
  WHERE employee_id = OLD.employee_id
  AND leave_type_id = v_leave_type_id
  AND year = v_year;

  v_current_balance := COALESCE(v_current_balance, 0);

  -- Map auth.uid() to employee_id (created_by FK requires employees.id, not user.id)
  SELECT id INTO v_actor_employee_id
  FROM employees
  WHERE user_id = auth.uid()
  AND organization_id = OLD.organization_id
  LIMIT 1;

  -- Fallback chain if current user not found as employee
  v_actor_employee_id := COALESCE(v_actor_employee_id, OLD.reviewed_by, OLD.employee_id);

  -- Insert refund log (existing sync trigger will update balance)
  INSERT INTO leave_balance_logs (
    employee_id, organization_id, leave_type, leave_type_id,
    change_amount, previous_balance, new_balance,
    reason, created_by, action, year, effective_date, leave_request_id
  )
  VALUES (
    OLD.employee_id, OLD.organization_id, OLD.leave_type, v_leave_type_id,
    OLD.days_count, -- Positive to refund
    v_current_balance, 
    v_current_balance + OLD.days_count,
    'Leave deleted: ' || OLD.leave_type || ' (' || OLD.start_date || ' to ' || OLD.end_date || ')',
    v_actor_employee_id,
    'leave_delete_refund',
    v_year,
    CURRENT_DATE,
    OLD.id
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;