-- Create office_schedules table for storing default work schedules per office
CREATE TABLE public.office_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_start_time TIME NOT NULL DEFAULT '09:00:00',
  work_end_time TIME NOT NULL DEFAULT '17:00:00',
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(office_id)
);

-- Enable RLS
ALTER TABLE public.office_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Owner/Admin can manage office schedules
CREATE POLICY "Owner and Admin can view office schedules"
ON public.office_schedules
FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) AND (
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Owner and Admin can insert office schedules"
ON public.office_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), organization_id) AND (
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Owner and Admin can update office schedules"
ON public.office_schedules
FOR UPDATE
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) AND (
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Owner and Admin can delete office schedules"
ON public.office_schedules
FOR DELETE
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) AND (
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_office_schedules_updated_at
BEFORE UPDATE ON public.office_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for office_schedules
ALTER PUBLICATION supabase_realtime ADD TABLE public.office_schedules;