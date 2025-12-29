-- Create KPI activity logs table to track all KPI-related actions
CREATE TABLE public.kpi_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_kpi_activity_logs_kpi_id ON public.kpi_activity_logs(kpi_id);
CREATE INDEX idx_kpi_activity_logs_organization_id ON public.kpi_activity_logs(organization_id);
CREATE INDEX idx_kpi_activity_logs_created_at ON public.kpi_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.kpi_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for org-scoped access
CREATE POLICY "Users can view activity logs for their organization"
ON public.kpi_activity_logs
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert activity logs for their organization"
ON public.kpi_activity_logs
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);