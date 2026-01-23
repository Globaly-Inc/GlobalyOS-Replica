-- Create trigger to handle employee office transfers
-- This maps leave balances to equivalent types in the new office

CREATE OR REPLACE FUNCTION handle_employee_office_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_new_olt_id uuid;
  v_old_office_name text;
  v_new_office_name text;
BEGIN
  -- Only proceed if office_id actually changed
  IF OLD.office_id IS NOT DISTINCT FROM NEW.office_id THEN
    RETURN NEW;
  END IF;
  
  -- Skip if no new office assigned
  IF NEW.office_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get office names for logging
  SELECT name INTO v_old_office_name FROM offices WHERE id = OLD.office_id;
  SELECT name INTO v_new_office_name FROM offices WHERE id = NEW.office_id;
  
  -- For each balance with an office_leave_type_id, try to map to new office
  FOR v_balance IN
    SELECT ltb.id, ltb.leave_type_id, ltb.office_leave_type_id, ltb.balance, ltb.year,
           olt.name as leave_type_name
    FROM leave_type_balances ltb
    LEFT JOIN office_leave_types olt ON olt.id = ltb.office_leave_type_id
    WHERE ltb.employee_id = NEW.id
      AND ltb.office_leave_type_id IS NOT NULL
  LOOP
    -- Find matching leave type in new office by name
    SELECT id INTO v_new_olt_id
    FROM office_leave_types
    WHERE office_id = NEW.office_id
      AND LOWER(name) = LOWER(v_balance.leave_type_name)
      AND is_active = true
    LIMIT 1;
    
    IF v_new_olt_id IS NOT NULL THEN
      -- Update balance to use new office's leave type
      UPDATE leave_type_balances
      SET office_leave_type_id = v_new_olt_id,
          updated_at = now()
      WHERE id = v_balance.id;
      
      -- Log the transfer
      INSERT INTO leave_balance_logs (
        employee_id,
        organization_id,
        leave_type,
        leave_type_id,
        change_amount,
        previous_balance,
        new_balance,
        reason,
        action,
        year,
        effective_date,
        created_by
      ) VALUES (
        NEW.id,
        NEW.organization_id,
        v_balance.leave_type_name,
        v_new_olt_id,
        0,
        v_balance.balance,
        v_balance.balance,
        format('Office transfer: %s → %s', COALESCE(v_old_office_name, 'None'), v_new_office_name),
        'office_transfer',
        v_balance.year,
        CURRENT_DATE,
        NEW.id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on employees table
DROP TRIGGER IF EXISTS trigger_employee_office_change ON employees;
CREATE TRIGGER trigger_employee_office_change
  AFTER UPDATE OF office_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_employee_office_change();