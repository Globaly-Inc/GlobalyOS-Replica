-- Create table for caching org structure templates
CREATE TABLE public.org_structure_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_category TEXT NOT NULL,
  company_size TEXT NOT NULL DEFAULT 'small',
  departments JSONB NOT NULL DEFAULT '[]',
  positions JSONB NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'ai',
  usage_count INTEGER DEFAULT 0,
  approval_count INTEGER DEFAULT 0,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_category, company_size, organization_id)
);

-- Index for fast lookups
CREATE INDEX idx_org_structure_templates_lookup 
  ON public.org_structure_templates(business_category, company_size);

-- Create table for learning from user selections
CREATE TABLE public.org_structure_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_category TEXT NOT NULL,
  department_name TEXT,
  position_name TEXT,
  position_department TEXT,
  action TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for aggregation queries
CREATE INDEX idx_org_structure_learning_category 
  ON public.org_structure_learning(business_category, action);

-- Enable RLS
ALTER TABLE public.org_structure_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_structure_learning ENABLE ROW LEVEL SECURITY;

-- RLS for templates: read global or own org templates
CREATE POLICY "Read org structure templates" ON public.org_structure_templates
  FOR SELECT USING (
    organization_id IS NULL 
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS for templates: insert/update for own org or global (service role)
CREATE POLICY "Manage org structure templates" ON public.org_structure_templates
  FOR ALL USING (
    organization_id IS NULL 
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS for learning: only own org
CREATE POLICY "Manage org structure learning" ON public.org_structure_learning
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Function to increment template approval count
CREATE OR REPLACE FUNCTION public.increment_template_approval(
  p_category TEXT,
  p_size TEXT DEFAULT 'small'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE org_structure_templates
  SET 
    approval_count = approval_count + 1,
    updated_at = now()
  WHERE business_category = p_category
    AND company_size = p_size
    AND organization_id IS NULL;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_org_structure_templates_updated_at
  BEFORE UPDATE ON public.org_structure_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();