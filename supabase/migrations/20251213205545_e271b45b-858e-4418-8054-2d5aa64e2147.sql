-- Drop ALL existing chat RLS policies first
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations in their org" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON chat_participants;
DROP POLICY IF EXISTS "Conversation creators can add participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON chat_participants;
DROP POLICY IF EXISTS "Org members can view public spaces" ON chat_spaces;
DROP POLICY IF EXISTS "Users can create spaces in their org" ON chat_spaces;
DROP POLICY IF EXISTS "Users can view space members" ON chat_space_members;
DROP POLICY IF EXISTS "Space admins can add members" ON chat_space_members;
DROP POLICY IF EXISTS "Members can leave spaces" ON chat_space_members;
DROP POLICY IF EXISTS "Users can view messages in their conversations/spaces" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations/spaces" ON chat_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view attachments in their messages" ON chat_attachments;
DROP POLICY IF EXISTS "Users can upload attachments to their messages" ON chat_attachments;
DROP POLICY IF EXISTS "Users can view mentions in their conversations" ON chat_mentions;
DROP POLICY IF EXISTS "Message senders can create mentions" ON chat_mentions;
DROP POLICY IF EXISTS "Users can view pinned resources" ON chat_pinned_resources;
DROP POLICY IF EXISTS "Users can pin resources in their chats" ON chat_pinned_resources;
DROP POLICY IF EXISTS "Org members can view presence" ON chat_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON chat_presence;
DROP POLICY IF EXISTS "chat_conversations_select" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert" ON chat_conversations;
DROP POLICY IF EXISTS "chat_participants_select" ON chat_participants;
DROP POLICY IF EXISTS "chat_participants_insert" ON chat_participants;
DROP POLICY IF EXISTS "chat_participants_delete" ON chat_participants;
DROP POLICY IF EXISTS "chat_spaces_select" ON chat_spaces;
DROP POLICY IF EXISTS "chat_spaces_insert" ON chat_spaces;
DROP POLICY IF EXISTS "chat_space_members_select" ON chat_space_members;
DROP POLICY IF EXISTS "chat_space_members_insert" ON chat_space_members;
DROP POLICY IF EXISTS "chat_space_members_delete" ON chat_space_members;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_attachments_select" ON chat_attachments;
DROP POLICY IF EXISTS "chat_attachments_insert" ON chat_attachments;
DROP POLICY IF EXISTS "chat_mentions_select" ON chat_mentions;
DROP POLICY IF EXISTS "chat_mentions_insert" ON chat_mentions;
DROP POLICY IF EXISTS "chat_pinned_resources_select" ON chat_pinned_resources;
DROP POLICY IF EXISTS "chat_pinned_resources_insert" ON chat_pinned_resources;
DROP POLICY IF EXISTS "chat_presence_select" ON chat_presence;
DROP POLICY IF EXISTS "chat_presence_all" ON chat_presence;

-- Drop old policy names too
DROP POLICY IF EXISTS "Participants can view their conversations" ON chat_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON chat_participants;
DROP POLICY IF EXISTS "Space members can view other members" ON chat_space_members;
DROP POLICY IF EXISTS "Participants can view conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Space members can view spaces" ON chat_spaces;
DROP POLICY IF EXISTS "Users can create spaces" ON chat_spaces;
DROP POLICY IF EXISTS "Participants can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Participants can view attachments" ON chat_attachments;
DROP POLICY IF EXISTS "Participants can upload attachments" ON chat_attachments;
DROP POLICY IF EXISTS "Participants can view mentions" ON chat_mentions;
DROP POLICY IF EXISTS "Participants can view pinned resources" ON chat_pinned_resources;
DROP POLICY IF EXISTS "Participants can pin resources" ON chat_pinned_resources;
DROP POLICY IF EXISTS "Users can update own presence" ON chat_presence;

-- Create or replace helper functions
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = _conversation_id 
    AND cp.employee_id = _employee_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_space_member(_space_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_space_members csm
    WHERE csm.space_id = _space_id 
    AND csm.employee_id = _employee_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_space_admin(_space_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_space_members csm
    WHERE csm.space_id = _space_id 
    AND csm.employee_id = _employee_id
    AND csm.role = 'admin'
  )
$$;

-- chat_conversations policies
CREATE POLICY "chat_conversations_select"
ON chat_conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_conversations.organization_id
    AND is_conversation_participant(chat_conversations.id, e.id)
  )
);

CREATE POLICY "chat_conversations_insert"
ON chat_conversations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_conversations.organization_id
    AND e.id = chat_conversations.created_by
  )
);

-- chat_participants policies
CREATE POLICY "chat_participants_select"
ON chat_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_participants.organization_id
    AND is_conversation_participant(chat_participants.conversation_id, e.id)
  )
);

CREATE POLICY "chat_participants_insert"
ON chat_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN chat_conversations c ON c.created_by = e.id
    WHERE e.user_id = auth.uid()
    AND c.id = chat_participants.conversation_id
    AND e.organization_id = chat_participants.organization_id
  )
  OR 
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_participants.employee_id
    AND e.organization_id = chat_participants.organization_id
  )
);

CREATE POLICY "chat_participants_delete"
ON chat_participants FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_participants.employee_id
  )
);

-- chat_spaces policies
CREATE POLICY "chat_spaces_select"
ON chat_spaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_spaces.organization_id
  )
  AND (
    chat_spaces.access_type = 'public' 
    OR EXISTS (
      SELECT 1 FROM employees e2
      WHERE e2.user_id = auth.uid()
      AND is_space_member(chat_spaces.id, e2.id)
    )
  )
);

CREATE POLICY "chat_spaces_insert"
ON chat_spaces FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_spaces.organization_id
    AND e.id = chat_spaces.created_by
  )
);

-- chat_space_members policies
CREATE POLICY "chat_space_members_select"
ON chat_space_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_space_members.organization_id
    AND is_space_member(chat_space_members.space_id, e.id)
  )
);

CREATE POLICY "chat_space_members_insert"
ON chat_space_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_space_members.organization_id
    AND is_space_admin(chat_space_members.space_id, e.id)
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.id = chat_space_members.employee_id
      AND e.organization_id = chat_space_members.organization_id
    )
    AND EXISTS (
      SELECT 1 FROM chat_spaces s
      WHERE s.id = chat_space_members.space_id
      AND s.access_type = 'public'
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM employees e
    JOIN chat_spaces s ON s.created_by = e.id
    WHERE e.user_id = auth.uid()
    AND s.id = chat_space_members.space_id
    AND e.id = chat_space_members.employee_id
  )
);

CREATE POLICY "chat_space_members_delete"
ON chat_space_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_space_members.employee_id
  )
);

-- chat_messages policies
CREATE POLICY "chat_messages_select"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_messages.organization_id
    AND (
      (chat_messages.conversation_id IS NOT NULL AND is_conversation_participant(chat_messages.conversation_id, e.id))
      OR (chat_messages.space_id IS NOT NULL AND is_space_member(chat_messages.space_id, e.id))
    )
  )
);

CREATE POLICY "chat_messages_insert"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_messages.sender_id
    AND e.organization_id = chat_messages.organization_id
    AND (
      (chat_messages.conversation_id IS NOT NULL AND is_conversation_participant(chat_messages.conversation_id, e.id))
      OR (chat_messages.space_id IS NOT NULL AND is_space_member(chat_messages.space_id, e.id))
    )
  )
);

CREATE POLICY "chat_messages_update"
ON chat_messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_messages.sender_id
  )
);

-- chat_attachments policies
CREATE POLICY "chat_attachments_select"
ON chat_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN employees e ON e.user_id = auth.uid()
    WHERE m.id = chat_attachments.message_id
    AND e.organization_id = chat_attachments.organization_id
    AND (
      (m.conversation_id IS NOT NULL AND is_conversation_participant(m.conversation_id, e.id))
      OR (m.space_id IS NOT NULL AND is_space_member(m.space_id, e.id))
    )
  )
);

CREATE POLICY "chat_attachments_insert"
ON chat_attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN employees e ON e.user_id = auth.uid()
    WHERE m.id = chat_attachments.message_id
    AND e.id = m.sender_id
  )
);

-- chat_mentions policies
CREATE POLICY "chat_mentions_select"
ON chat_mentions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN employees e ON e.user_id = auth.uid()
    WHERE m.id = chat_mentions.message_id
    AND e.organization_id = chat_mentions.organization_id
    AND (
      (m.conversation_id IS NOT NULL AND is_conversation_participant(m.conversation_id, e.id))
      OR (m.space_id IS NOT NULL AND is_space_member(m.space_id, e.id))
    )
  )
);

CREATE POLICY "chat_mentions_insert"
ON chat_mentions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN employees e ON e.user_id = auth.uid()
    WHERE m.id = chat_mentions.message_id
    AND e.id = m.sender_id
  )
);

-- chat_pinned_resources policies
CREATE POLICY "chat_pinned_resources_select"
ON chat_pinned_resources FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_pinned_resources.organization_id
    AND (
      (chat_pinned_resources.conversation_id IS NOT NULL AND is_conversation_participant(chat_pinned_resources.conversation_id, e.id))
      OR (chat_pinned_resources.space_id IS NOT NULL AND is_space_member(chat_pinned_resources.space_id, e.id))
    )
  )
);

CREATE POLICY "chat_pinned_resources_insert"
ON chat_pinned_resources FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_pinned_resources.pinned_by
    AND e.organization_id = chat_pinned_resources.organization_id
    AND (
      (chat_pinned_resources.conversation_id IS NOT NULL AND is_conversation_participant(chat_pinned_resources.conversation_id, e.id))
      OR (chat_pinned_resources.space_id IS NOT NULL AND is_space_member(chat_pinned_resources.space_id, e.id))
    )
  )
);

-- chat_presence policies
CREATE POLICY "chat_presence_select"
ON chat_presence FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_presence.organization_id
  )
);

CREATE POLICY "chat_presence_all"
ON chat_presence FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_presence.employee_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
    AND e.id = chat_presence.employee_id
  )
);