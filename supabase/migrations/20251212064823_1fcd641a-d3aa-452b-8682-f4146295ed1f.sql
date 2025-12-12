-- Create table for public holidays and events
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'holiday' CHECK (event_type IN ('holiday', 'event')),
  created_by UUID NOT NULL REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Org members can view calendar events
CREATE POLICY "Org members can view calendar events"
ON public.calendar_events
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- HR and admins can manage calendar events
CREATE POLICY "HR and admins can manage calendar events"
ON public.calendar_events
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_calendar_events_org_dates ON public.calendar_events(organization_id, start_date, end_date);