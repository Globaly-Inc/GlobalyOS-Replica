-- Create projects table for organization projects with icons
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder', -- Lucide icon name
  color TEXT NOT NULL DEFAULT '#3b82f6', -- Hex color
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_projects junction table
CREATE TABLE public.employee_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, project_id)
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_projects ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Users can view projects in their organization"
ON public.projects FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage projects"
ON public.projects FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "HR can manage projects"
ON public.projects FOR ALL
USING (has_role(auth.uid(), 'hr'))
WITH CHECK (has_role(auth.uid(), 'hr'));

-- Employee projects RLS policies
CREATE POLICY "Users can view employee projects in their organization"
ON public.employee_projects FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage employee projects"
ON public.employee_projects FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "HR can manage employee projects"
ON public.employee_projects FOR ALL
USING (has_role(auth.uid(), 'hr'))
WITH CHECK (has_role(auth.uid(), 'hr'));

-- Add updated_at trigger for projects
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();