-- Create table to cache AI profile summaries
CREATE TABLE public.profile_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- Enable RLS
ALTER TABLE public.profile_summaries ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view summaries
CREATE POLICY "All authenticated users can view profile summaries"
ON public.profile_summaries
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- HR and admins can manage summaries
CREATE POLICY "HR and admins can manage profile summaries"
ON public.profile_summaries
FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- Users can regenerate summaries (insert/update)
CREATE POLICY "Users can create profile summaries"
ON public.profile_summaries
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update profile summaries"
ON public.profile_summaries
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Trigger to update updated_at
CREATE TRIGGER update_profile_summaries_updated_at
BEFORE UPDATE ON public.profile_summaries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();