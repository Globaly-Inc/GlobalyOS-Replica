-- Add role column to chat_participants table
ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- Add check constraint for valid roles
ALTER TABLE public.chat_participants
ADD CONSTRAINT chat_participants_role_check 
CHECK (role IN ('admin', 'member'));

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_chat_participants_role 
ON public.chat_participants(conversation_id, role);

-- Create a security definer function to check if user is group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(p_conversation_id uuid, p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE conversation_id = p_conversation_id
      AND employee_id = p_employee_id
      AND role = 'admin'
  )
$$;

-- RLS policy: Group admins can update other participants' roles
CREATE POLICY "Group admins can update participant roles"
ON public.chat_participants
FOR UPDATE
USING (
  -- User is a participant in this conversation
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = chat_participants.conversation_id
    AND cp.employee_id = (
      SELECT id FROM public.employees 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  )
  AND (
    -- User is updating their own record OR is a group admin
    chat_participants.employee_id = (
      SELECT id FROM public.employees 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
    OR public.is_group_admin(
      chat_participants.conversation_id,
      (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
    )
  )
);

-- RLS policy: Group admins can remove participants
CREATE POLICY "Group admins can remove participants"
ON public.chat_participants
FOR DELETE
USING (
  -- User is removing themselves OR is a group admin
  chat_participants.employee_id = (
    SELECT id FROM public.employees 
    WHERE user_id = auth.uid() 
    LIMIT 1
  )
  OR public.is_group_admin(
    chat_participants.conversation_id,
    (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- RLS policy: Group admins can add new participants
CREATE POLICY "Group admins can add participants"
ON public.chat_participants
FOR INSERT
WITH CHECK (
  -- User is the one being added (joining) OR is a group admin of the conversation
  chat_participants.employee_id = (
    SELECT id FROM public.employees 
    WHERE user_id = auth.uid() 
    LIMIT 1
  )
  OR public.is_group_admin(
    chat_participants.conversation_id,
    (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
  )
);