-- Create function to handle leave request deletion and auto-refund balance
CREATE OR REPLACE FUNCTION public.handle_leave_request_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_leave_type_id uuid;
  v_year integer;
  v_current_balance numeric;
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

  -- Insert refund log (existing sync trigger will update balance)
  INSERT INTO leave_balance_logs (
    employee_id, organization_id, leave_type, leave_type_id,
    change_amount, previous_balance, new_balance,
    reason, created_by, action, year, effective_date
  )
  VALUES (
    OLD.employee_id, OLD.organization_id, OLD.leave_type, v_leave_type_id,
    OLD.days_count, -- Positive to refund
    v_current_balance, 
    v_current_balance + OLD.days_count,
    'Leave deleted: ' || OLD.leave_type || ' (' || OLD.start_date || ' to ' || OLD.end_date || ')',
    COALESCE(auth.uid(), OLD.reviewed_by, OLD.employee_id),
    'leave_delete_refund',
    v_year,
    CURRENT_DATE
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on leave_requests for DELETE
DROP TRIGGER IF EXISTS trg_handle_leave_request_delete ON public.leave_requests;
CREATE TRIGGER trg_handle_leave_request_delete
BEFORE DELETE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_leave_request_delete();

-- Update FK constraint to allow deletion (set to NULL instead of blocking)
ALTER TABLE leave_balance_logs 
DROP CONSTRAINT IF EXISTS leave_balance_logs_leave_request_id_fkey;

ALTER TABLE leave_balance_logs 
ADD CONSTRAINT leave_balance_logs_leave_request_id_fkey 
FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) 
ON DELETE SET NULL;