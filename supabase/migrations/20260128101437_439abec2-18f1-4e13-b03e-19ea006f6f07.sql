-- Create optimized function for batch fetching last messages
CREATE OR REPLACE FUNCTION public.get_last_messages_batch(conversation_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  id uuid,
  content text,
  content_type text,
  created_at timestamptz,
  sender_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (cm.conversation_id)
    cm.conversation_id,
    cm.id,
    cm.content,
    cm.content_type,
    cm.created_at,
    cm.sender_id
  FROM chat_messages cm
  WHERE cm.conversation_id = ANY(conversation_ids)
  ORDER BY cm.conversation_id, cm.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_last_messages_batch(uuid[]) TO authenticated;