-- Offboarding Proration Trigger
CREATE OR REPLACE FUNCTION handle_leave_proration_on_offboarding()
RETURNS TRIGGER AS $$
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
BEGIN
  IF NOT (
    (OLD.last_working_day IS NULL AND NEW.last_working_day IS NOT NULL) OR
    (OLD.contract_end_date IS NULL AND NEW.contract_end_date IS NOT NULL)
  ) THEN
    RETURN NEW;
  END IF;
  
  v_year_start := make_date(v_year, 1, 1);
  v_effective_end := COALESCE(NEW.last_working_day, NEW.contract_end_date);
  v_effective_start := GREATEST(NEW.join_date::DATE, v_year_start);
  
  SELECT id INTO v_actor_employee_id
  FROM employees WHERE user_id = auth.uid() 
  AND organization_id = NEW.organization_id LIMIT 1;
  
  v_actor_employee_id := COALESCE(v_actor_employee_id, NEW.id);
  
  FOR v_leave_type IN 
    SELECT ltb.id AS balance_id, ltb.leave_type_id, ltb.balance, lt.default_days, lt.name
    FROM leave_type_balances ltb
    JOIN leave_types lt ON lt.id = ltb.leave_type_id
    WHERE ltb.employee_id = NEW.id AND ltb.year = v_year
    AND lt.category = 'paid' AND lt.default_days IS NOT NULL AND lt.default_days > 0
  LOOP
    v_prorated_entitlement := calculate_prorated_leave_monthly(v_leave_type.default_days, v_effective_start, v_effective_end);
    v_used_leave := v_leave_type.default_days - v_leave_type.balance;
    
    IF v_used_leave > v_prorated_entitlement THEN
      RAISE EXCEPTION 'Cannot set resignation. % used: % days, prorated: % days (exceeded by % days).',
        v_leave_type.name, ROUND(v_used_leave, 2), ROUND(v_prorated_entitlement, 2), 
        ROUND(v_used_leave - v_prorated_entitlement, 2);
    END IF;
    
    v_adjustment := v_prorated_entitlement - v_leave_type.default_days;
    
    IF v_adjustment != 0 THEN
      INSERT INTO leave_balance_logs (
        employee_id, organization_id, leave_type, leave_type_id,
        change_amount, previous_balance, new_balance,
        reason, created_by, action, year, effective_date
      ) VALUES (
        NEW.id, NEW.organization_id, v_leave_type.name, v_leave_type.leave_type_id,
        v_adjustment, v_leave_type.balance, v_leave_type.balance + v_adjustment,
        'Proration for offboarding (' || v_effective_start || ' to ' || v_effective_end || ')',
        v_actor_employee_id, 'proration_adjustment', v_year, CURRENT_DATE
      );
    END IF;
  END LOOP;
  
  IF NEW.last_working_day IS NOT NULL AND OLD.last_working_day IS NULL THEN
    NEW.resignation_submitted_at := CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_leave_proration_offboarding ON employees;
CREATE TRIGGER trg_leave_proration_offboarding
BEFORE UPDATE ON employees FOR EACH ROW
EXECUTE FUNCTION handle_leave_proration_on_offboarding();

-- Workflow Creation Function
CREATE OR REPLACE FUNCTION create_workflow_from_template(
  p_employee_id UUID, p_organization_id UUID, p_workflow_type TEXT, p_target_date DATE, p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_template_id UUID; v_workflow_id UUID; v_task RECORD;
  v_assignee_id UUID; v_due_date DATE; v_manager_id UUID; v_hr_employee_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM workflow_templates
  WHERE organization_id = p_organization_id AND type = p_workflow_type AND is_default = true LIMIT 1;
  
  IF v_template_id IS NULL THEN RETURN NULL; END IF;
  
  SELECT manager_id INTO v_manager_id FROM employees WHERE id = p_employee_id;
  
  SELECT e.id INTO v_hr_employee_id FROM employees e
  JOIN user_roles ur ON ur.user_id = e.user_id
  WHERE e.organization_id = p_organization_id AND ur.role IN ('hr', 'admin', 'owner') AND e.status = 'active' LIMIT 1;
  
  INSERT INTO employee_workflows (employee_id, organization_id, template_id, type, status, start_date, target_date, created_by)
  VALUES (p_employee_id, p_organization_id, v_template_id, p_workflow_type, 'active', CURRENT_DATE, p_target_date, p_created_by)
  RETURNING id INTO v_workflow_id;
  
  FOR v_task IN SELECT * FROM workflow_template_tasks WHERE template_id = v_template_id ORDER BY sort_order
  LOOP
    v_assignee_id := CASE v_task.assignee_type
      WHEN 'employee' THEN p_employee_id WHEN 'manager' THEN v_manager_id
      WHEN 'hr' THEN v_hr_employee_id WHEN 'it' THEN v_hr_employee_id
      WHEN 'specific_person' THEN v_task.assignee_id ELSE NULL END;
    v_due_date := p_target_date + v_task.due_days_offset;
    
    INSERT INTO employee_workflow_tasks (workflow_id, organization_id, employee_id, title, description, category, assignee_id, due_date, is_required, status, sort_order)
    VALUES (v_workflow_id, p_organization_id, p_employee_id, v_task.title, v_task.description, v_task.category, v_assignee_id, v_due_date, v_task.is_required, 'pending', v_task.sort_order);
  END LOOP;
  
  RETURN v_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-create onboarding workflow
CREATE OR REPLACE FUNCTION handle_new_hire_onboarding()
RETURNS TRIGGER AS $$
DECLARE v_workflow_id UUID;
BEGIN
  IF NEW.status = 'active' AND NEW.is_new_hire = true THEN
    IF NOT EXISTS (SELECT 1 FROM employee_workflows WHERE employee_id = NEW.id AND type = 'onboarding') THEN
      v_workflow_id := create_workflow_from_template(NEW.id, NEW.organization_id, 'onboarding', NEW.join_date::DATE, NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_new_hire_onboarding ON employees;
CREATE TRIGGER trg_new_hire_onboarding AFTER INSERT ON employees FOR EACH ROW EXECUTE FUNCTION handle_new_hire_onboarding();

-- Auto-create offboarding workflow
CREATE OR REPLACE FUNCTION handle_offboarding_workflow()
RETURNS TRIGGER AS $$
DECLARE v_workflow_id UUID; v_actor_employee_id UUID;
BEGIN
  IF OLD.last_working_day IS NULL AND NEW.last_working_day IS NOT NULL THEN
    SELECT id INTO v_actor_employee_id FROM employees WHERE user_id = auth.uid() AND organization_id = NEW.organization_id LIMIT 1;
    
    IF NOT EXISTS (SELECT 1 FROM employee_workflows WHERE employee_id = NEW.id AND type = 'offboarding') THEN
      v_workflow_id := create_workflow_from_template(NEW.id, NEW.organization_id, 'offboarding', NEW.last_working_day, v_actor_employee_id);
      
      IF v_workflow_id IS NOT NULL THEN
        INSERT INTO exit_interviews (employee_id, organization_id, workflow_id) VALUES (NEW.id, NEW.organization_id, v_workflow_id);
        INSERT INTO asset_handovers (employee_id, organization_id, workflow_id, asset_name, category, status) VALUES 
          (NEW.id, NEW.organization_id, v_workflow_id, 'Laptop', 'hardware', 'assigned'),
          (NEW.id, NEW.organization_id, v_workflow_id, 'ID Card/Access Badge', 'access', 'assigned'),
          (NEW.id, NEW.organization_id, v_workflow_id, 'Office Keys', 'access', 'assigned');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_offboarding_workflow ON employees;
CREATE TRIGGER trg_offboarding_workflow AFTER UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION handle_offboarding_workflow();