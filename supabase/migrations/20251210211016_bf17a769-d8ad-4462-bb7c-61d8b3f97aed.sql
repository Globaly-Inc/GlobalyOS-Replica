-- Create offices table
CREATE TABLE public.offices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add office_id to employees table
ALTER TABLE public.employees ADD COLUMN office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL;

-- Enable RLS on offices
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

-- RLS policies for offices
CREATE POLICY "Users can view offices in their organization"
ON public.offices
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage offices"
ON public.offices
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for better query performance
CREATE INDEX idx_offices_organization_id ON public.offices(organization_id);
CREATE INDEX idx_employees_office_id ON public.employees(office_id);

-- Trigger for updated_at
CREATE TRIGGER update_offices_updated_at
BEFORE UPDATE ON public.offices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();