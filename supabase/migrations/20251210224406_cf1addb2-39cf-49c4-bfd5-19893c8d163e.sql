-- Create leave_types table
CREATE TABLE public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'paid', -- 'paid' or 'unpaid'
  description TEXT,
  default_days NUMERIC DEFAULT 0, -- default annual allocation
  applies_to_all_offices BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for leave types to offices mapping
CREATE TABLE public.leave_type_offices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(leave_type_id, office_id)
);

-- Enable RLS
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_type_offices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_types
CREATE POLICY "Admins can manage leave types"
ON public.leave_types
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view leave types in their organization"
ON public.leave_types
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- RLS Policies for leave_type_offices
CREATE POLICY "Admins can manage leave type offices"
ON public.leave_type_offices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM leave_types lt
    WHERE lt.id = leave_type_offices.leave_type_id
    AND has_role(auth.uid(), 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leave_types lt
    WHERE lt.id = leave_type_offices.leave_type_id
    AND has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can view leave type offices"
ON public.leave_type_offices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leave_types lt
    WHERE lt.id = leave_type_offices.leave_type_id
    AND is_org_member(auth.uid(), lt.organization_id)
  )
);

-- Add indexes
CREATE INDEX idx_leave_types_organization ON public.leave_types(organization_id);
CREATE INDEX idx_leave_type_offices_leave_type ON public.leave_type_offices(leave_type_id);
CREATE INDEX idx_leave_type_offices_office ON public.leave_type_offices(office_id);