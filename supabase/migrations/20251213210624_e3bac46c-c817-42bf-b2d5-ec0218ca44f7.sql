-- Update chat_participants INSERT policy to be org-aware
DROP POLICY IF EXISTS "chat_participants_insert" ON chat_participants;

CREATE POLICY "chat_participants_insert" ON chat_participants
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND (
    -- Either user is adding themselves
    employee_id = get_current_employee_id_for_org(organization_id)
    -- Or user created the conversation and is adding others
    OR EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_participants.conversation_id
      AND c.created_by = get_current_employee_id_for_org(chat_participants.organization_id)
    )
  )
);

-- Also update the old policies that use get_current_employee_id()
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON chat_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON chat_participants;
DROP POLICY IF EXISTS "chat_participants_select" ON chat_participants;
DROP POLICY IF EXISTS "chat_participants_delete" ON chat_participants;

-- Recreate chat_participants SELECT policy
CREATE POLICY "chat_participants_select" ON chat_participants
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
  AND is_conversation_participant(conversation_id, get_current_employee_id_for_org(organization_id))
);

-- Recreate chat_participants UPDATE policy
CREATE POLICY "chat_participants_update" ON chat_participants
FOR UPDATE
USING (employee_id = get_current_employee_id_for_org(organization_id));

-- Recreate chat_participants DELETE policy  
CREATE POLICY "chat_participants_delete" ON chat_participants
FOR DELETE
USING (employee_id = get_current_employee_id_for_org(organization_id));