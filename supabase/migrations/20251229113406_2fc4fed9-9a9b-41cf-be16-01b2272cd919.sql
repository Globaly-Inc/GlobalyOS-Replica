-- Create broken_link_reports table for tracking 404 occurrences
CREATE TABLE public.broken_link_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  user_agent TEXT,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broken_link_reports ENABLE ROW LEVEL SECURITY;

-- Only super admins can view broken link reports
CREATE POLICY "Super admins can view broken link reports"
ON public.broken_link_reports
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Allow edge function to insert via service role (no policy needed for service role)
-- Allow authenticated users to insert their own reports
CREATE POLICY "Users can report broken links"
ON public.broken_link_reports
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_broken_link_reports_path ON public.broken_link_reports(path);
CREATE INDEX idx_broken_link_reports_reported_at ON public.broken_link_reports(reported_at DESC);