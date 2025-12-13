-- Create junction table for calendar events and offices
CREATE TABLE public.calendar_event_offices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(calendar_event_id, office_id)
);

-- Add applies_to_all_offices column to calendar_events
ALTER TABLE public.calendar_events ADD COLUMN applies_to_all_offices BOOLEAN NOT NULL DEFAULT true;

-- Enable RLS
ALTER TABLE public.calendar_event_offices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_event_offices
CREATE POLICY "HR and admins can manage calendar event offices"
ON public.calendar_event_offices
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view calendar event offices"
ON public.calendar_event_offices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calendar_events ce
    WHERE ce.id = calendar_event_offices.calendar_event_id
    AND is_org_member(auth.uid(), ce.organization_id)
  )
);