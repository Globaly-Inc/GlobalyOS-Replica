-- Migrate departments from org_structure_templates (pick the highest approval_count version per category)
WITH ranked_templates AS (
  SELECT 
    business_category,
    departments,
    positions,
    ROW_NUMBER() OVER (PARTITION BY business_category ORDER BY approval_count DESC, created_at DESC) as rn
  FROM org_structure_templates
),
best_templates AS (
  SELECT business_category, departments, positions
  FROM ranked_templates
  WHERE rn = 1
),
dept_records AS (
  SELECT DISTINCT
    bt.business_category,
    dept.value::text as name,
    dept.ordinality as sort_order
  FROM best_templates bt,
  LATERAL jsonb_array_elements_text(bt.departments) WITH ORDINALITY AS dept(value, ordinality)
)
INSERT INTO template_departments (business_category, name, sort_order, is_active)
SELECT business_category, name, sort_order::int, true
FROM dept_records
ON CONFLICT (business_category, name) DO NOTHING;

-- Migrate positions from org_structure_templates
WITH ranked_templates AS (
  SELECT 
    business_category,
    positions,
    ROW_NUMBER() OVER (PARTITION BY business_category ORDER BY approval_count DESC, created_at DESC) as rn
  FROM org_structure_templates
),
best_templates AS (
  SELECT business_category, positions
  FROM ranked_templates
  WHERE rn = 1
),
pos_records AS (
  SELECT DISTINCT
    bt.business_category,
    pos.value->>'department' as department_name,
    pos.value->>'name' as name,
    pos.ordinality as sort_order
  FROM best_templates bt,
  LATERAL jsonb_array_elements(bt.positions) WITH ORDINALITY AS pos(value, ordinality)
)
INSERT INTO template_positions (business_category, department_name, name, sort_order, is_active)
SELECT 
  business_category, 
  COALESCE(department_name, 'General'), 
  name, 
  sort_order::int, 
  true
FROM pos_records
WHERE name IS NOT NULL
ON CONFLICT (business_category, department_name, name) DO NOTHING;

-- Add frequently used custom items from org_structure_learning (items added by 2+ orgs)
WITH popular_departments AS (
  SELECT 
    business_category,
    department_name,
    COUNT(DISTINCT organization_id) as usage_count
  FROM org_structure_learning
  WHERE department_name IS NOT NULL 
    AND position_name IS NULL
    AND action = 'added'
  GROUP BY business_category, department_name
  HAVING COUNT(DISTINCT organization_id) >= 2
)
INSERT INTO template_departments (business_category, name, sort_order, is_active)
SELECT business_category, department_name, 100, true
FROM popular_departments
ON CONFLICT (business_category, name) DO NOTHING;

-- Add frequently used custom positions from org_structure_learning
WITH popular_positions AS (
  SELECT 
    business_category,
    position_department,
    position_name,
    COUNT(DISTINCT organization_id) as usage_count
  FROM org_structure_learning
  WHERE position_name IS NOT NULL 
    AND action = 'added'
  GROUP BY business_category, position_department, position_name
  HAVING COUNT(DISTINCT organization_id) >= 2
)
INSERT INTO template_positions (business_category, department_name, name, sort_order, is_active)
SELECT 
  business_category, 
  COALESCE(position_department, 'General'), 
  position_name, 
  100, 
  true
FROM popular_positions
ON CONFLICT (business_category, department_name, name) DO NOTHING;

-- Mark processed learning records as added to templates
UPDATE org_structure_learning
SET 
  processed_at = now(),
  added_to_templates = true
WHERE id IN (
  SELECT osl.id
  FROM org_structure_learning osl
  LEFT JOIN template_departments td 
    ON td.business_category = osl.business_category 
    AND td.name = osl.department_name
  LEFT JOIN template_positions tp 
    ON tp.business_category = osl.business_category 
    AND tp.name = osl.position_name
  WHERE (td.id IS NOT NULL OR tp.id IS NOT NULL)
    AND osl.added_to_templates = false
);