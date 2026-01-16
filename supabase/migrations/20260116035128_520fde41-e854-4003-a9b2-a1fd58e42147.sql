-- Temporarily disable the new hire onboarding trigger
ALTER TABLE employees DISABLE TRIGGER trg_new_hire_onboarding;

-- Backfill: Create employee records for organization owners who don't have one
INSERT INTO employees (organization_id, user_id, position, department, join_date, status, is_new_hire, employee_onboarding_completed)
SELECT 
  om.organization_id,
  om.user_id,
  'Owner',
  'Management',
  COALESCE(o.created_at::date, CURRENT_DATE),
  'active',
  false,  -- owners are not new hires
  true    -- skip onboarding for owners
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.role = 'owner'
  AND o.approval_status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.user_id = om.user_id 
    AND e.organization_id = om.organization_id
  );

-- Re-enable the trigger
ALTER TABLE employees ENABLE TRIGGER trg_new_hire_onboarding;

-- Create position_history records for the newly created employee records
INSERT INTO position_history (employee_id, organization_id, position, department, effective_date, is_current, change_type)
SELECT 
  e.id,
  e.organization_id,
  e.position,
  e.department,
  e.join_date,
  true,
  'hire'
FROM employees e
JOIN organization_members om ON om.user_id = e.user_id AND om.organization_id = e.organization_id
WHERE om.role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM position_history ph 
    WHERE ph.employee_id = e.id
  );