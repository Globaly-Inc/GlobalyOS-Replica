-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create review_templates table
CREATE TABLE IF NOT EXISTS public.review_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  what_went_well_prompts TEXT[] DEFAULT '{}',
  needs_improvement_prompts TEXT[] DEFAULT '{}',
  goals_prompts TEXT[] DEFAULT '{}',
  competencies JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on review_templates
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_templates
CREATE POLICY "Org members can view review templates"
ON public.review_templates FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage review templates"
ON public.review_templates FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Add foreign key for template_id
ALTER TABLE public.performance_reviews 
ADD CONSTRAINT performance_reviews_template_id_fkey 
FOREIGN KEY (template_id) REFERENCES public.review_templates(id) ON DELETE SET NULL;

-- Create trigger for updated_at on review_templates
CREATE TRIGGER update_review_templates_updated_at
BEFORE UPDATE ON public.review_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();