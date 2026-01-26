-- Create a policy that allows conversation/space participants to update is_pinned on messages
-- This is separate from the existing policy that only allows message owners to edit content

CREATE POLICY "Participants can pin messages in their conversations"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  -- User must be org member
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_messages.organization_id
  )
  AND (
    -- For conversations: must be a participant
    (
      conversation_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.chat_participants cp
        JOIN public.employees e ON e.id = cp.employee_id
        WHERE cp.conversation_id = chat_messages.conversation_id
        AND e.user_id = auth.uid()
      )
    )
    OR
    -- For spaces: must be a member
    (
      space_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.chat_space_members csm
        JOIN public.employees e ON e.id = csm.employee_id
        WHERE csm.space_id = chat_messages.space_id
        AND e.user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_messages.organization_id
  )
  AND (
    (
      conversation_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.chat_participants cp
        JOIN public.employees e ON e.id = cp.employee_id
        WHERE cp.conversation_id = chat_messages.conversation_id
        AND e.user_id = auth.uid()
      )
    )
    OR
    (
      space_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.chat_space_members csm
        JOIN public.employees e ON e.id = csm.employee_id
        WHERE csm.space_id = chat_messages.space_id
        AND e.user_id = auth.uid()
      )
    )
  )
);