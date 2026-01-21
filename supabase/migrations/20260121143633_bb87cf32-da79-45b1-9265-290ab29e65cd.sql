-- Create template_departments table for normalized department storage
CREATE TABLE public.template_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_category, name)
);

-- Create template_positions table for normalized position storage
CREATE TABLE public.template_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_category TEXT NOT NULL,
  department_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  responsibilities TEXT[],
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_category, department_name, name)
);

-- Add tracking fields to org_structure_learning
ALTER TABLE public.org_structure_learning 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS added_to_templates BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_template_departments_category ON public.template_departments(business_category);
CREATE INDEX idx_template_positions_category ON public.template_positions(business_category);
CREATE INDEX idx_template_positions_department ON public.template_positions(business_category, department_name);
CREATE INDEX idx_org_structure_learning_processed ON public.org_structure_learning(added_to_templates, processed_at);

-- Enable RLS
ALTER TABLE public.template_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_departments (super admin only for writes via user_roles table, public read)
CREATE POLICY "Anyone can view template departments"
ON public.template_departments FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage template departments"
ON public.template_departments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- RLS policies for template_positions (super admin only for writes, public read)
CREATE POLICY "Anyone can view template positions"
ON public.template_positions FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage template positions"
ON public.template_positions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Create trigger for updated_at on template_departments
CREATE TRIGGER update_template_departments_updated_at
BEFORE UPDATE ON public.template_departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on template_positions
CREATE TRIGGER update_template_positions_updated_at
BEFORE UPDATE ON public.template_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();