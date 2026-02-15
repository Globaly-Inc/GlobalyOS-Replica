
-- Create org_pipelines table
CREATE TABLE public.org_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create org_pipeline_stages table
CREATE TABLE public.org_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.org_pipelines(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_org_pipelines_org ON public.org_pipelines(organization_id);
CREATE INDEX idx_org_pipeline_stages_pipeline ON public.org_pipeline_stages(pipeline_id);
CREATE INDEX idx_org_pipeline_stages_org ON public.org_pipeline_stages(organization_id);

-- Enable RLS
ALTER TABLE public.org_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_pipelines
CREATE POLICY "Users can view org pipelines"
  ON public.org_pipelines FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert org pipelines"
  ON public.org_pipelines FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update org pipelines"
  ON public.org_pipelines FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete org pipelines"
  ON public.org_pipelines FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- RLS policies for org_pipeline_stages
CREATE POLICY "Users can view org pipeline stages"
  ON public.org_pipeline_stages FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert org pipeline stages"
  ON public.org_pipeline_stages FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update org pipeline stages"
  ON public.org_pipeline_stages FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete org pipeline stages"
  ON public.org_pipeline_stages FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_org_pipelines_updated_at
  BEFORE UPDATE ON public.org_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_pipeline_stages_updated_at
  BEFORE UPDATE ON public.org_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
