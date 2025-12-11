-- Add image_url column to updates table for single photo support
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS image_url text;

-- Create reactions table for emoji reactions on feed items
CREATE TABLE public.feed_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type text NOT NULL CHECK (target_type IN ('update', 'kudos')),
  target_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(target_type, target_id, employee_id, emoji)
);

-- Enable RLS
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for feed_reactions
CREATE POLICY "Users can view reactions in their organization"
ON public.feed_reactions
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can add reactions"
ON public.feed_reactions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

CREATE POLICY "Users can remove their own reactions"
ON public.feed_reactions
FOR DELETE
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));