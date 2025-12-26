-- Create kpi_owners table for multiple owners per KPI
CREATE TABLE public.kpi_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kpi_id, employee_id)
);

-- Create index for faster lookups
CREATE INDEX idx_kpi_owners_kpi_id ON public.kpi_owners(kpi_id);
CREATE INDEX idx_kpi_owners_employee_id ON public.kpi_owners(employee_id);
CREATE INDEX idx_kpi_owners_organization_id ON public.kpi_owners(organization_id);

-- Enable RLS
ALTER TABLE public.kpi_owners ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view KPI owners in their org"
  ON public.kpi_owners FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert KPI owners in their org"
  ON public.kpi_owners FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can update KPI owners"
  ON public.kpi_owners FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can delete KPI owners"
  ON public.kpi_owners FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role));