ALTER TABLE public.jobs
  ADD COLUMN pipeline_id UUID REFERENCES public.org_pipelines(id) ON DELETE SET NULL;