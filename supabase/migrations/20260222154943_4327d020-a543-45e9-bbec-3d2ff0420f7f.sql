
-- Create crm_service_categories table
CREATE TABLE public.crm_service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint per org
ALTER TABLE public.crm_service_categories
  ADD CONSTRAINT crm_service_categories_org_slug_unique UNIQUE (organization_id, slug);

-- Index for fast lookup
CREATE INDEX idx_crm_service_categories_org ON public.crm_service_categories(organization_id);

-- Enable RLS
ALTER TABLE public.crm_service_categories ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read their own org's categories
CREATE POLICY "Org members can view service categories"
  ON public.crm_service_categories FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- RLS: org members can insert categories for their own org
CREATE POLICY "Org members can create service categories"
  ON public.crm_service_categories FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- RLS: org members can update their own org's categories
CREATE POLICY "Org members can update service categories"
  ON public.crm_service_categories FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- RLS: org members can delete their own org's categories
CREATE POLICY "Org members can delete service categories"
  ON public.crm_service_categories FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Function to seed default categories if org has none yet
CREATE OR REPLACE FUNCTION public.ensure_crm_service_categories_defaults(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if org has zero categories
  IF NOT EXISTS (
    SELECT 1 FROM public.crm_service_categories WHERE organization_id = p_organization_id
  ) THEN
    INSERT INTO public.crm_service_categories (organization_id, name, slug, sort_order, is_default) VALUES
      (p_organization_id, 'Visa Services',        'visa-services',        1,  true),
      (p_organization_id, 'Education / Courses',   'education-courses',    2,  true),
      (p_organization_id, 'Insurance',             'insurance',            3,  true),
      (p_organization_id, 'Accommodation',         'accommodation',        4,  true),
      (p_organization_id, 'Health Services',        'health-services',      5,  true),
      (p_organization_id, 'Financial Services',     'financial-services',   6,  true),
      (p_organization_id, 'Legal Services',         'legal-services',       7,  true),
      (p_organization_id, 'Translation Services',   'translation-services', 8,  true),
      (p_organization_id, 'Employment Services',    'employment-services',  9,  true),
      (p_organization_id, 'Other',                  'other',               10,  true);
  END IF;
END;
$$;
