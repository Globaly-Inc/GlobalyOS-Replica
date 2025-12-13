-- Update chat_conversations SELECT policy to allow creators to see their conversations
DROP POLICY IF EXISTS "chat_conversations_select" ON chat_conversations;

CREATE POLICY "chat_conversations_select" ON chat_conversations
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
  AND (
    -- Creator can always see
    created_by = get_current_employee_id_for_org(organization_id)
    -- Or is a participant
    OR is_conversation_participant(id, get_current_employee_id_for_org(organization_id))
  )
);

-- Update chat_conversations UPDATE policy
DROP POLICY IF EXISTS "Participants can update conversation" ON chat_conversations;

CREATE POLICY "chat_conversations_update" ON chat_conversations
FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND (
    created_by = get_current_employee_id_for_org(organization_id)
    OR is_conversation_participant(id, get_current_employee_id_for_org(organization_id))
  )
);

-- Update chat_messages policies
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;

CREATE POLICY "chat_messages_insert" ON chat_messages
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND sender_id = get_current_employee_id_for_org(organization_id)
  AND (
    (conversation_id IS NOT NULL AND is_conversation_participant(conversation_id, get_current_employee_id_for_org(organization_id)))
    OR (space_id IS NOT NULL AND is_space_member(space_id, get_current_employee_id_for_org(organization_id)))
  )
);

CREATE POLICY "chat_messages_select" ON chat_messages
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
  AND (
    (conversation_id IS NOT NULL AND is_conversation_participant(conversation_id, get_current_employee_id_for_org(organization_id)))
    OR (space_id IS NOT NULL AND is_space_member(space_id, get_current_employee_id_for_org(organization_id)))
  )
);