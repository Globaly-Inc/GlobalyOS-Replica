-- Backfill employment types for approved organizations that don't have any
INSERT INTO employment_types (organization_id, name, label, display_order, is_system, is_active)
SELECT 
  o.id,
  et.name,
  et.label,
  et.display_order,
  true as is_system,
  true as is_active
FROM organizations o
CROSS JOIN (
  VALUES 
    ('trainee', 'Trainee', 1),
    ('intern', 'Intern', 2),
    ('contract', 'Contract', 3),
    ('employee', 'Employee', 4)
) AS et(name, label, display_order)
WHERE o.approval_status = 'approved'
  AND o.id != '11111111-1111-1111-1111-111111111111'
  AND NOT EXISTS (
    SELECT 1 FROM employment_types 
    WHERE organization_id = o.id
  );

-- Backfill positions for approved organizations that don't have any
INSERT INTO positions (organization_id, name, department)
SELECT 
  o.id,
  p.name,
  p.department
FROM organizations o
CROSS JOIN (
  VALUES 
    ('CEO', 'Management'),
    ('Manager', 'Management'),
    ('Team Lead', 'Engineering'),
    ('Senior Developer', 'Engineering'),
    ('Developer', 'Engineering'),
    ('HR Manager', 'Human Resources'),
    ('HR Specialist', 'Human Resources'),
    ('Marketing Manager', 'Marketing'),
    ('Sales Representative', 'Sales'),
    ('Operations Manager', 'Operations'),
    ('Accountant', 'Finance'),
    ('Support Specialist', 'Customer Support')
) AS p(name, department)
WHERE o.approval_status = 'approved'
  AND o.id != '11111111-1111-1111-1111-111111111111'
  AND NOT EXISTS (
    SELECT 1 FROM positions 
    WHERE organization_id = o.id
  );