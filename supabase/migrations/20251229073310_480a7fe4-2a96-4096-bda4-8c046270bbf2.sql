-- Add employment_type to position_history table
ALTER TABLE public.position_history 
ADD COLUMN IF NOT EXISTS employment_type text;

-- Create employment_types table for organization-customizable options
CREATE TABLE IF NOT EXISTS public.employment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.employment_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view employment types in their org"
  ON public.employment_types FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage employment types"
  ON public.employment_types FOR ALL
  USING (
    is_org_member(auth.uid(), organization_id) AND 
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
  )
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) AND 
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
  );

-- Seed default employment types for all existing organizations
INSERT INTO public.employment_types (organization_id, name, label, is_system, display_order)
SELECT id, 'trainee', 'Trainee', true, 1 FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.employment_types (organization_id, name, label, is_system, display_order)
SELECT id, 'intern', 'Intern', true, 2 FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.employment_types (organization_id, name, label, is_system, display_order)
SELECT id, 'contract', 'Contract', true, 3 FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.employment_types (organization_id, name, label, is_system, display_order)
SELECT id, 'employee', 'Employee', true, 4 FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;