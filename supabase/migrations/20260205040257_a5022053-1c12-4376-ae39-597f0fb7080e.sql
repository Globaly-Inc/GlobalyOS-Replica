-- Fix office-transfer leave balance migration to be office-centric
-- (legacy leave_type_id columns were removed; use office_leave_type_id)

CREATE OR REPLACE FUNCTION public.handle_employee_office_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Fail-safe: do not block the employee update if automation fails
  BEGIN
    -- Get office names for logging
    SELECT name INTO v_old_office_name FROM offices WHERE id = OLD.office_id;
    SELECT name INTO v_new_office_name FROM offices WHERE id = NEW.office_id;

    -- For each balance with an office_leave_type_id, try to map to new office
    FOR v_balance IN
      SELECT ltb.id,
             ltb.office_leave_type_id,
             ltb.balance,
             ltb.year,
             olt.name AS leave_type_name
      FROM leave_type_balances ltb
      LEFT JOIN office_leave_types olt ON olt.id = ltb.office_leave_type_id
      WHERE ltb.employee_id = NEW.id
        AND ltb.office_leave_type_id IS NOT NULL
    LOOP
      -- Find matching leave type in new office by name
      SELECT id INTO v_new_olt_id
      FROM office_leave_types
      WHERE office_id = NEW.office_id
        AND organization_id = NEW.organization_id
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
          office_leave_type_id,
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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_employee_office_change failed: %', SQLERRM;
      RETURN NEW;
  END;

  RETURN NEW;
END;
$function$;