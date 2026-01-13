-- Add onboarding flags to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS org_onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS org_onboarding_step integer DEFAULT 0;

-- Add onboarding flags to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS employee_onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS employee_onboarding_step integer DEFAULT 0;

-- Create org_onboarding_data table to store wizard progress
CREATE TABLE public.org_onboarding_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  current_step integer DEFAULT 1,
  organization_info jsonb DEFAULT '{}'::jsonb,
  offices jsonb DEFAULT '[]'::jsonb,
  team_members jsonb DEFAULT '[]'::jsonb,
  enabled_features jsonb DEFAULT '[]'::jsonb,
  hr_settings jsonb DEFAULT '{}'::jsonb,
  skipped boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Create employee_onboarding_data table
CREATE TABLE public.employee_onboarding_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  current_step integer DEFAULT 1,
  personal_info jsonb DEFAULT '{}'::jsonb,
  completed_slides boolean DEFAULT false,
  tour_completed boolean DEFAULT false,
  skipped boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id)
);

-- Enable RLS on new tables
ALTER TABLE public.org_onboarding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboarding_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_onboarding_data
-- Org owners can view and update their org's onboarding data
CREATE POLICY "Org owners can view their onboarding data"
ON public.org_onboarding_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_onboarding_data.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'owner'
  )
);

CREATE POLICY "Org owners can insert their onboarding data"
ON public.org_onboarding_data
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_onboarding_data.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'owner'
  )
);

CREATE POLICY "Org owners can update their onboarding data"
ON public.org_onboarding_data
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_onboarding_data.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'owner'
  )
);

-- RLS policies for employee_onboarding_data
-- Employees can view and update their own onboarding data
CREATE POLICY "Employees can view their onboarding data"
ON public.employee_onboarding_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_onboarding_data.employee_id
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can insert their onboarding data"
ON public.employee_onboarding_data
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_onboarding_data.employee_id
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can update their onboarding data"
ON public.employee_onboarding_data
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_onboarding_data.employee_id
    AND e.user_id = auth.uid()
  )
);

-- Admins/HR can view employee onboarding data in their org
CREATE POLICY "Admins can view employee onboarding data"
ON public.employee_onboarding_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.organization_id = employee_onboarding_data.organization_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'admin', 'hr')
  )
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_org_onboarding_data_updated_at
  BEFORE UPDATE ON public.org_onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_updated_at();

CREATE TRIGGER update_employee_onboarding_data_updated_at
  BEFORE UPDATE ON public.employee_onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_updated_at();

-- Add indexes for performance
CREATE INDEX idx_org_onboarding_data_org_id ON public.org_onboarding_data(organization_id);
CREATE INDEX idx_employee_onboarding_data_employee_id ON public.employee_onboarding_data(employee_id);
CREATE INDEX idx_employee_onboarding_data_org_id ON public.employee_onboarding_data(organization_id);