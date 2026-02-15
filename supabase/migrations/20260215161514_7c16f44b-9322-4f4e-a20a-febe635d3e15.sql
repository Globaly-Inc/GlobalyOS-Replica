
-- Pipeline stage rules for automation config
CREATE TABLE public.pipeline_stage_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  auto_assignment_template_id UUID REFERENCES public.assignment_templates(id) ON DELETE SET NULL,
  auto_reject_after_hours INTEGER,
  auto_reject_on_deadline BOOLEAN NOT NULL DEFAULT false,
  notify_employee_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, job_id, stage_key)
);

-- Enable RLS
ALTER TABLE public.pipeline_stage_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped by organization via employees table
CREATE POLICY "Users can view pipeline rules for their org"
  ON public.pipeline_stage_rules
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pipeline rules for their org"
  ON public.pipeline_stage_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pipeline rules for their org"
  ON public.pipeline_stage_rules
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pipeline rules for their org"
  ON public.pipeline_stage_rules
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_pipeline_stage_rules_updated_at
  BEFORE UPDATE ON public.pipeline_stage_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
