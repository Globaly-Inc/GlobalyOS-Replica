
-- 1. Create task_custom_fields table
CREATE TABLE public.task_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.task_spaces(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'date', 'select')),
  options JSONB DEFAULT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint per org+space+key
ALTER TABLE public.task_custom_fields
  ADD CONSTRAINT task_custom_fields_org_space_key_unique UNIQUE (organization_id, space_id, field_key);

-- RLS
ALTER TABLE public.task_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom fields in their org"
  ON public.task_custom_fields FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert custom fields in their org"
  ON public.task_custom_fields FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update custom fields in their org"
  ON public.task_custom_fields FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete custom fields in their org"
  ON public.task_custom_fields FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- 2. Add custom_fields JSONB column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT NULL;
