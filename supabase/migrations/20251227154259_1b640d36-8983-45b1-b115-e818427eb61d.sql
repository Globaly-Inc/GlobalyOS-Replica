-- Drop existing constraint
ALTER TABLE public.kpis DROP CONSTRAINT IF EXISTS kpis_scope_check;

-- Add updated constraint that includes organization scope
ALTER TABLE public.kpis ADD CONSTRAINT kpis_scope_check CHECK (
  (scope_type = 'individual' AND employee_id IS NOT NULL) OR
  (scope_type = 'department' AND scope_department IS NOT NULL AND employee_id IS NULL) OR
  (scope_type = 'office' AND scope_office_id IS NOT NULL AND employee_id IS NULL) OR
  (scope_type = 'project' AND scope_project_id IS NOT NULL AND employee_id IS NULL) OR
  (scope_type = 'organization' AND employee_id IS NULL AND scope_department IS NULL AND scope_office_id IS NULL AND scope_project_id IS NULL)
);

-- Make quarter nullable for annual KPIs
ALTER TABLE public.kpis ALTER COLUMN quarter DROP NOT NULL;