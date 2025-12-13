-- Drop and recreate chat_participants INSERT policy to fix initial creation issue
DROP POLICY IF EXISTS "chat_participants_insert" ON chat_participants;

-- Simplified INSERT policy: conversation creator can add anyone, or user can add themselves
CREATE POLICY "chat_participants_insert"
ON chat_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- User's org must match
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_participants.organization_id
  )
  AND (
    -- Conversation creator can add anyone
    EXISTS (
      SELECT 1 FROM employees e
      JOIN chat_conversations c ON c.created_by = e.id AND c.id = chat_participants.conversation_id
      WHERE e.user_id = auth.uid()
    )
    OR 
    -- User can add themselves
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.id = chat_participants.employee_id
    )
  )
);

-- Also fix chat_messages INSERT policy - users should be able to send to newly created conversations
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;

CREATE POLICY "chat_messages_insert"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_messages.sender_id
    AND e.organization_id = chat_messages.organization_id
  )
  AND (
    (chat_messages.conversation_id IS NOT NULL AND is_conversation_participant(chat_messages.conversation_id, chat_messages.sender_id))
    OR (chat_messages.space_id IS NOT NULL AND is_space_member(chat_messages.space_id, chat_messages.sender_id))
  )
);