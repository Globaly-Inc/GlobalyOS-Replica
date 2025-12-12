-- Create KPI templates table
CREATE TABLE public.kpi_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  unit TEXT,
  category TEXT,
  created_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpi_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "HR and admins can manage KPI templates"
ON public.kpi_templates
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view KPI templates"
ON public.kpi_templates
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Add trigger for updated_at
CREATE TRIGGER update_kpi_templates_updated_at
BEFORE UPDATE ON public.kpi_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();