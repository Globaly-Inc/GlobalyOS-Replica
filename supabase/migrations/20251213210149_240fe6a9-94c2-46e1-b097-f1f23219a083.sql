-- Drop and recreate the chat_conversations INSERT policy with simpler check
DROP POLICY IF EXISTS "chat_conversations_insert" ON chat_conversations;

CREATE POLICY "chat_conversations_insert" ON chat_conversations
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND created_by = get_current_employee_id()
);