-- Add scope columns to kpis table for group KPIs
ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'individual';

ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS scope_department TEXT;

ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS scope_office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL;

ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS scope_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Make employee_id nullable for group KPIs
ALTER TABLE public.kpis 
ALTER COLUMN employee_id DROP NOT NULL;

-- Add CHECK constraint to ensure proper scope configuration
ALTER TABLE public.kpis 
ADD CONSTRAINT kpis_scope_check CHECK (
  (scope_type = 'individual' AND employee_id IS NOT NULL) OR
  (scope_type = 'department' AND scope_department IS NOT NULL AND employee_id IS NULL) OR
  (scope_type = 'office' AND scope_office_id IS NOT NULL AND employee_id IS NULL) OR
  (scope_type = 'project' AND scope_project_id IS NOT NULL AND employee_id IS NULL)
);

-- Create indexes for faster group KPI lookups
CREATE INDEX IF NOT EXISTS idx_kpis_scope_type ON public.kpis(scope_type);
CREATE INDEX IF NOT EXISTS idx_kpis_scope_department ON public.kpis(scope_department) WHERE scope_department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kpis_scope_office_id ON public.kpis(scope_office_id) WHERE scope_office_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kpis_scope_project_id ON public.kpis(scope_project_id) WHERE scope_project_id IS NOT NULL;

-- Add RLS policy for viewing group KPIs
CREATE POLICY "Users can view group KPIs in their org"
ON public.kpis
FOR SELECT
USING (
  scope_type != 'individual' 
  AND is_org_member(auth.uid(), organization_id)
);

-- Add RLS policy for HR/admin to manage group KPIs
CREATE POLICY "HR and admins can manage group KPIs"
ON public.kpis
FOR ALL
USING (
  scope_type != 'individual'
  AND (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
  AND is_org_member(auth.uid(), organization_id)
)
WITH CHECK (
  scope_type != 'individual'
  AND (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
  AND is_org_member(auth.uid(), organization_id)
);