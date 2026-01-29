-- Create optimized function to fetch all unread messages in a single query
CREATE OR REPLACE FUNCTION public.get_unread_messages(
  p_employee_id UUID,
  p_organization_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  created_at TIMESTAMPTZ,
  conversation_id UUID,
  space_id UUID,
  sender_employee_id UUID,
  sender_full_name TEXT,
  sender_avatar_url TEXT,
  conversation_name TEXT,
  conversation_is_group BOOLEAN,
  space_name TEXT,
  space_icon_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.content_type,
    m.created_at,
    m.conversation_id,
    m.space_id,
    e.id as sender_employee_id,
    p.full_name as sender_full_name,
    p.avatar_url as sender_avatar_url,
    c.name as conversation_name,
    c.is_group as conversation_is_group,
    s.name as space_name,
    s.icon_url as space_icon_url
  FROM chat_messages m
  LEFT JOIN employees e ON m.sender_id = e.id
  LEFT JOIN profiles p ON e.user_id = p.id
  LEFT JOIN chat_conversations c ON m.conversation_id = c.id
  LEFT JOIN chat_spaces s ON m.space_id = s.id
  WHERE m.organization_id = p_organization_id
    AND m.sender_id != p_employee_id
    AND m.content_type != 'system_event'
    AND (
      -- Unread conversation messages
      (m.conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM chat_participants cp 
        WHERE cp.conversation_id = m.conversation_id 
          AND cp.employee_id = p_employee_id
          AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      ))
      OR
      -- Unread space messages
      (m.space_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM chat_space_members sm 
        WHERE sm.space_id = m.space_id 
          AND sm.employee_id = p_employee_id
          AND (sm.last_read_at IS NULL OR m.created_at > sm.last_read_at)
      ))
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;