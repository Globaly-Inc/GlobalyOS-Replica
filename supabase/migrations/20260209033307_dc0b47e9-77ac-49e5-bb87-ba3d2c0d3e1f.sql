
-- 1. Rewrite handle_leave_proration_on_offboarding to support SET, EDIT, and DELETE scenarios
-- Uses office_leave_types (current architecture) and calculate_prorated_leave_monthly for consistency
CREATE OR REPLACE FUNCTION public.handle_leave_proration_on_offboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_year_start DATE;
  v_effective_end DATE;
  v_effective_start DATE;
  v_leave_type RECORD;
  v_prorated_entitlement NUMERIC;
  v_used_leave NUMERIC;
  v_adjustment NUMERIC;
  v_actor_employee_id UUID;
  v_is_set BOOLEAN := FALSE;
  v_is_edit BOOLEAN := FALSE;
  v_is_delete BOOLEAN := FALSE;
BEGIN
  -- Determine scenario
  v_is_set := (OLD.last_working_day IS NULL AND NEW.last_working_day IS NOT NULL);
  v_is_edit := (OLD.last_working_day IS NOT NULL AND NEW.last_working_day IS NOT NULL AND OLD.last_working_day != NEW.last_working_day);
  v_is_delete := (OLD.last_working_day IS NOT NULL AND NEW.last_working_day IS NULL);

  -- Exit early if no relevant change
  IF NOT (v_is_set OR v_is_edit OR v_is_delete) THEN
    RETURN NEW;
  END IF;

  -- Get actor
  SELECT id INTO v_actor_employee_id
  FROM employees WHERE user_id = auth.uid()
  AND organization_id = NEW.organization_id LIMIT 1;
  v_actor_employee_id := COALESCE(v_actor_employee_id, NEW.id);

  -- STEP 1: Reverse previous proration logs if editing or deleting
  IF v_is_edit OR v_is_delete THEN
    DELETE FROM leave_balance_logs
    WHERE employee_id = NEW.id
      AND year = v_year
      AND action = 'proration_adjustment';
    -- Also delete any logs from the buggy trigger that used 'offboarding_proration'
    DELETE FROM leave_balance_logs
    WHERE employee_id = NEW.id
      AND year = v_year
      AND action = 'offboarding_proration';
  END IF;

  -- STEP 2: If setting or editing, calculate new proration
  IF v_is_set OR v_is_edit THEN
    v_effective_end := NEW.last_working_day;
    v_year_start := make_date(v_year, 1, 1);
    v_effective_start := GREATEST(NEW.join_date::DATE, v_year_start);

    FOR v_leave_type IN
      SELECT ltb.id AS balance_id, ltb.office_leave_type_id, ltb.balance, olt.default_days, olt.name
      FROM leave_type_balances ltb
      JOIN office_leave_types olt ON olt.id = ltb.office_leave_type_id
      WHERE ltb.employee_id = NEW.id AND ltb.year = v_year
        AND olt.category = 'paid' AND olt.default_days IS NOT NULL AND olt.default_days > 0
    LOOP
      -- For edit scenario, balance was already restored by the DELETE above (sync_balance_from_log recalculates)
      -- We need to get the current balance AFTER reversal. Since sync_balance_from_log runs per-row on log insert/delete,
      -- we re-read the balance.
      IF v_is_edit THEN
        SELECT balance INTO v_leave_type.balance
        FROM leave_type_balances
        WHERE id = v_leave_type.balance_id;
      END IF;

      v_prorated_entitlement := calculate_prorated_leave_monthly(v_leave_type.default_days, v_effective_start, v_effective_end);
      v_used_leave := v_leave_type.default_days - v_leave_type.balance;

      -- Block if employee has exceeded prorated entitlement
      IF v_used_leave > v_prorated_entitlement THEN
        RAISE EXCEPTION 'Cannot set resignation. % used: % days, prorated: % days (exceeded by % days).',
          v_leave_type.name, ROUND(v_used_leave, 2), ROUND(v_prorated_entitlement, 2),
          ROUND(v_used_leave - v_prorated_entitlement, 2);
      END IF;

      v_adjustment := v_prorated_entitlement - v_leave_type.default_days;

      IF v_adjustment != 0 THEN
        INSERT INTO leave_balance_logs (
          employee_id, organization_id, leave_type, office_leave_type_id,
          change_amount, previous_balance, new_balance,
          reason, created_by, action, year, effective_date
        ) VALUES (
          NEW.id, NEW.organization_id, v_leave_type.name, v_leave_type.office_leave_type_id,
          v_adjustment, v_leave_type.balance, v_leave_type.balance + v_adjustment,
          'Proration for offboarding (' || v_effective_start || ' to ' || v_effective_end || ')',
          v_actor_employee_id, 'proration_adjustment', v_year, CURRENT_DATE
        );
      END IF;
    END LOOP;
  END IF;

  -- Update resignation timestamp
  IF v_is_set THEN
    NEW.resignation_submitted_at := CURRENT_TIMESTAMP;
  ELSIF v_is_delete THEN
    NEW.resignation_submitted_at := NULL;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Leave proration error for employee %: %', NEW.id, SQLERRM;
    -- Re-raise to block the update if it's a validation error
    IF SQLERRM LIKE 'Cannot set resignation%' THEN
      RAISE;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Rewrite handle_offboarding_workflow to support edit and delete
CREATE OR REPLACE FUNCTION public.handle_offboarding_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_workflow_id UUID; v_actor_employee_id UUID;
BEGIN
  -- SET: create new offboarding workflow
  IF OLD.last_working_day IS NULL AND NEW.last_working_day IS NOT NULL THEN
    SELECT id INTO v_actor_employee_id FROM employees WHERE user_id = auth.uid() AND organization_id = NEW.organization_id LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM employee_workflows WHERE employee_id = NEW.id AND type = 'offboarding' AND status = 'active') THEN
      v_workflow_id := create_workflow_from_template(NEW.id, NEW.organization_id, 'offboarding', NEW.last_working_day, v_actor_employee_id);

      IF v_workflow_id IS NOT NULL THEN
        INSERT INTO exit_interviews (employee_id, organization_id, workflow_id) VALUES (NEW.id, NEW.organization_id, v_workflow_id);
        INSERT INTO asset_handovers (employee_id, organization_id, workflow_id, asset_name, category, status) VALUES
          (NEW.id, NEW.organization_id, v_workflow_id, 'Laptop', 'hardware', 'assigned'),
          (NEW.id, NEW.organization_id, v_workflow_id, 'ID Card/Access Badge', 'access', 'assigned'),
          (NEW.id, NEW.organization_id, v_workflow_id, 'Office Keys', 'access', 'assigned');
      END IF;
    END IF;

  -- EDIT: update existing workflow target_date and task due dates
  ELSIF OLD.last_working_day IS NOT NULL AND NEW.last_working_day IS NOT NULL AND OLD.last_working_day != NEW.last_working_day THEN
    UPDATE employee_workflows
    SET target_date = NEW.last_working_day, updated_at = NOW()
    WHERE employee_id = NEW.id AND type = 'offboarding' AND status = 'active';

    -- Shift task due dates by the difference
    UPDATE employee_workflow_tasks
    SET due_date = due_date + (NEW.last_working_day - OLD.last_working_day)
    WHERE workflow_id IN (
      SELECT id FROM employee_workflows WHERE employee_id = NEW.id AND type = 'offboarding' AND status = 'active'
    ) AND status = 'pending';

  -- DELETE: cancel offboarding workflow
  ELSIF OLD.last_working_day IS NOT NULL AND NEW.last_working_day IS NULL THEN
    UPDATE employee_workflows
    SET status = 'cancelled', updated_at = NOW()
    WHERE employee_id = NEW.id AND type = 'offboarding' AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;
