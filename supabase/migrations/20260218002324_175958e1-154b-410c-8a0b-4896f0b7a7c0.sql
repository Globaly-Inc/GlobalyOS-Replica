
-- 1. Add custom_fields JSONB to crm_contacts and crm_companies
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- 2. Add new columns to crm_activity_log
ALTER TABLE public.crm_activity_log ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.crm_activity_log ADD COLUMN IF NOT EXISTS duration_minutes integer;
ALTER TABLE public.crm_activity_log ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 3. Create crm_custom_fields table
CREATE TABLE public.crm_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'contact' or 'company'
  field_name text NOT NULL,
  field_key text NOT NULL,
  field_type text NOT NULL, -- text, number, date, select, checkbox
  options jsonb,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_crm_custom_fields_org ON public.crm_custom_fields(organization_id);
ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_custom_fields_select" ON public.crm_custom_fields FOR SELECT TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_custom_fields_insert" ON public.crm_custom_fields FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_custom_fields_update" ON public.crm_custom_fields FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_custom_fields_delete" ON public.crm_custom_fields FOR DELETE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

-- 4. Create crm_tags table
CREATE TABLE public.crm_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_crm_tags_org ON public.crm_tags(organization_id);
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_tags_select" ON public.crm_tags FOR SELECT TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_tags_insert" ON public.crm_tags FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_tags_update" ON public.crm_tags FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_tags_delete" ON public.crm_tags FOR DELETE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
