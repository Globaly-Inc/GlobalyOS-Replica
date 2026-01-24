-- Add office_leave_type_id column to leave_balance_logs (matches leave_type_balances schema)
ALTER TABLE leave_balance_logs 
ADD COLUMN IF NOT EXISTS office_leave_type_id UUID REFERENCES office_leave_types(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leave_balance_logs_office_leave_type_id 
ON leave_balance_logs(office_leave_type_id);

-- Update sync_balance_from_log function to handle office_leave_type_id
CREATE OR REPLACE FUNCTION public.sync_balance_from_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Handle office_leave_type_id based balances (new system)
  IF NEW.office_leave_type_id IS NOT NULL THEN
    INSERT INTO leave_type_balances (employee_id, office_leave_type_id, organization_id, balance, year)
    VALUES (NEW.employee_id, NEW.office_leave_type_id, v_org_id, NEW.change_amount, v_year)
    ON CONFLICT (employee_id, office_leave_type_id, year) 
    DO UPDATE SET 
      balance = leave_type_balances.balance + NEW.change_amount,
      updated_at = now();
  -- Handle leave_type_id based balances (legacy system)
  ELSIF NEW.leave_type_id IS NOT NULL THEN
    INSERT INTO leave_type_balances (employee_id, leave_type_id, organization_id, balance, year)
    VALUES (NEW.employee_id, NEW.leave_type_id, v_org_id, NEW.change_amount, v_year)
    ON CONFLICT (employee_id, leave_type_id, year) 
    DO UPDATE SET 
      balance = leave_type_balances.balance + NEW.change_amount,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;