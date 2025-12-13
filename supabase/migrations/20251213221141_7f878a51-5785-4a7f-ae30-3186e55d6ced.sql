-- Drop ALL existing chat_spaces policies first
DROP POLICY IF EXISTS "Space admins can update spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Space admins can delete spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Org members can view public spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Space members can view private spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "Org members can create spaces" ON public.chat_spaces;

-- Recreate chat_spaces policies with non-recursive approach
CREATE POLICY "Org members can view public spaces"
ON public.chat_spaces
FOR SELECT
TO authenticated
USING (
  access_type = 'public'
  AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
);

CREATE POLICY "Space members can view private spaces"
ON public.chat_spaces
FOR SELECT
TO authenticated
USING (
  access_type = 'private'
  AND id IN (
    SELECT csm.space_id FROM public.chat_space_members csm
    WHERE csm.employee_id = public.get_current_employee_id()
  )
);

CREATE POLICY "Org members can create spaces"
ON public.chat_spaces
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  AND created_by = public.get_current_employee_id()
);

CREATE POLICY "Space admins can update spaces"
ON public.chat_spaces
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT csm.space_id FROM public.chat_space_members csm
    WHERE csm.employee_id = public.get_current_employee_id()
    AND csm.role = 'admin'
  )
);

CREATE POLICY "Space admins can delete spaces"
ON public.chat_spaces
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT csm.space_id FROM public.chat_space_members csm
    WHERE csm.employee_id = public.get_current_employee_id()
    AND csm.role = 'admin'
  )
);

-- Create chat_message_reactions table
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, employee_id, emoji)
);

-- Enable RLS on chat_message_reactions
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_message_reactions
CREATE POLICY "Users can view reactions in their org"
ON public.chat_message_reactions
FOR SELECT
TO authenticated
USING (
  organization_id IN (SELECT public.get_user_organizations(auth.uid()))
);

CREATE POLICY "Users can add reactions"
ON public.chat_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = public.get_current_employee_id()
  AND organization_id IN (SELECT public.get_user_organizations(auth.uid()))
);

CREATE POLICY "Users can remove own reactions"
ON public.chat_message_reactions
FOR DELETE
TO authenticated
USING (
  employee_id = public.get_current_employee_id()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;