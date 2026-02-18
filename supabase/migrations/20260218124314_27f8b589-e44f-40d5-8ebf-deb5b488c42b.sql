
-- Add stage_id column to hiring_email_templates for per-stage template scoping
ALTER TABLE public.hiring_email_templates
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.org_pipeline_stages(id) ON DELETE CASCADE;

-- Index for fast per-stage lookups
CREATE INDEX IF NOT EXISTS idx_hiring_email_templates_stage_id
  ON public.hiring_email_templates(stage_id);
