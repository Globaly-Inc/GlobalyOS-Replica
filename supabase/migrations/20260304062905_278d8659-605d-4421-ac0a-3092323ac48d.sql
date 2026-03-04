
-- Add slug column to assignment_templates
ALTER TABLE public.assignment_templates ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill existing templates: generate slugs from name
UPDATE public.assignment_templates
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Handle duplicate slugs within same org by appending row number
WITH dupes AS (
  SELECT id, organization_id, slug,
    ROW_NUMBER() OVER (PARTITION BY organization_id, slug ORDER BY created_at) as rn
  FROM public.assignment_templates
  WHERE slug IS NOT NULL
)
UPDATE public.assignment_templates t
SET slug = dupes.slug || '-' || dupes.rn
FROM dupes
WHERE t.id = dupes.id AND dupes.rn > 1;

-- Add unique constraint per org
ALTER TABLE public.assignment_templates
  ADD CONSTRAINT assignment_templates_org_slug_unique UNIQUE (organization_id, slug);
