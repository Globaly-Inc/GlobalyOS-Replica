
-- Add public_token to assignment_templates for shareable per-template links
ALTER TABLE public.assignment_templates
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

-- Backfill existing templates with UUIDs
UPDATE public.assignment_templates
SET public_token = gen_random_uuid()::text
WHERE public_token IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.assignment_templates
  ALTER COLUMN public_token SET NOT NULL,
  ALTER COLUMN public_token SET DEFAULT gen_random_uuid()::text;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_assignment_templates_public_token
  ON public.assignment_templates (public_token);
