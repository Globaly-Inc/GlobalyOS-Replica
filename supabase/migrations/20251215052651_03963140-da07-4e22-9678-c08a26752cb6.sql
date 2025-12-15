-- Add chat tables to realtime publication for instant updates
-- Using DO block to handle if table already in publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_spaces;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_space_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mentions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

-- Enable REPLICA IDENTITY FULL for proper realtime updates with complete row data
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_spaces REPLICA IDENTITY FULL;
ALTER TABLE public.chat_space_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_attachments REPLICA IDENTITY FULL;
ALTER TABLE public.chat_presence REPLICA IDENTITY FULL;

-- Add indexes for better query performance on frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created 
ON public.chat_messages(conversation_id, created_at DESC) 
WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_space_created 
ON public.chat_messages(space_id, created_at DESC) 
WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_participants_employee_org 
ON public.chat_participants(employee_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_chat_space_members_employee_org 
ON public.chat_space_members(employee_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_chat_presence_employee 
ON public.chat_presence(employee_id);

-- Create optimized function to get unread counts in a single query
CREATE OR REPLACE FUNCTION public.get_unread_counts_batch(_employee_id uuid, _organization_id uuid)
RETURNS TABLE(
  context_type text,
  context_id uuid,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get conversation unread counts
  RETURN QUERY
  SELECT 
    'conversation'::text as context_type,
    cp.conversation_id as context_id,
    COUNT(cm.id)::bigint as unread_count
  FROM chat_participants cp
  LEFT JOIN chat_messages cm ON cm.conversation_id = cp.conversation_id 
    AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    AND cm.sender_id != _employee_id
  WHERE cp.employee_id = _employee_id 
    AND cp.organization_id = _organization_id
  GROUP BY cp.conversation_id;

  -- Get space unread counts
  RETURN QUERY
  SELECT 
    'space'::text as context_type,
    csm.space_id as context_id,
    COUNT(cm.id)::bigint as unread_count
  FROM chat_space_members csm
  LEFT JOIN chat_messages cm ON cm.space_id = csm.space_id 
    AND cm.created_at > COALESCE(csm.last_read_at, '1970-01-01'::timestamptz)
    AND cm.sender_id != _employee_id
  WHERE csm.employee_id = _employee_id 
    AND csm.organization_id = _organization_id
  GROUP BY csm.space_id;
END;
$$;