-- Create departments table as the single source of truth
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view departments in their organization"
  ON public.departments FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'hr')
  ));

-- Add department_id foreign key to positions table
ALTER TABLE public.positions 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add department_id and position_id foreign keys to employees table
ALTER TABLE public.employees 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.employees 
ADD COLUMN position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();