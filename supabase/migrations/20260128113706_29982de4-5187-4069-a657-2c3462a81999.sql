-- Create helper function to check if user can post in a space
CREATE OR REPLACE FUNCTION can_post_in_space(p_space_id uuid, p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chat_spaces cs
    LEFT JOIN chat_space_members csm ON csm.space_id = cs.id AND csm.employee_id = p_employee_id
    WHERE cs.id = p_space_id
    AND (
      -- Collaboration spaces: any member can post
      cs.space_type = 'collaboration'
      OR
      -- Announcement spaces: only admins can post
      (cs.space_type = 'announcements' AND csm.role = 'admin')
    )
  );
$$;

-- Update the INSERT policy to enforce admin-only posting in announcement spaces
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;

CREATE POLICY "chat_messages_insert" ON chat_messages
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND sender_id = get_current_employee_id_for_org(organization_id)
  AND (
    -- Conversations: must be a participant
    (conversation_id IS NOT NULL AND is_conversation_participant(conversation_id, get_current_employee_id_for_org(organization_id)))
    OR 
    -- Spaces: must be a member AND have permission to post (admin for announcements)
    (space_id IS NOT NULL AND is_space_member(space_id, get_current_employee_id_for_org(organization_id)) AND can_post_in_space(space_id, get_current_employee_id_for_org(organization_id)))
  )
);