-- Create table for update mentions (tagged team members)
CREATE TABLE public.update_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id UUID NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(update_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.update_mentions ENABLE ROW LEVEL SECURITY;

-- Users can view mentions in their organization
CREATE POLICY "Users can view mentions in their organization"
ON public.update_mentions
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Users can add mentions to their own updates
CREATE POLICY "Users can add mentions to own updates"
ON public.update_mentions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM updates u
    WHERE u.id = update_id
    AND u.employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

-- Users can delete mentions from their own updates
CREATE POLICY "Users can delete mentions from own updates"
ON public.update_mentions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM updates u
    WHERE u.id = update_id
    AND u.employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);