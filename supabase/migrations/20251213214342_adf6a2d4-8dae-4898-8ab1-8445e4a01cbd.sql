-- Add RLS policy for message deletion (only sender can delete) - if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own messages' AND tablename = 'chat_messages'
  ) THEN
    CREATE POLICY "Users can delete their own messages" 
    ON public.chat_messages 
    FOR DELETE 
    USING (sender_id = get_current_employee_id());
  END IF;
END $$;

-- Enable realtime for reactions (if table was created)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_message_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;