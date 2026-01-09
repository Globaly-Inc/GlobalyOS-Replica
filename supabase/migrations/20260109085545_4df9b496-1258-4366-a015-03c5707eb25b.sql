-- Enable REPLICA IDENTITY for proper realtime tracking
ALTER TABLE workflow_task_comments REPLICA IDENTITY FULL;
ALTER TABLE workflow_task_attachments REPLICA IDENTITY FULL;
ALTER TABLE workflow_task_checklists REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workflow_task_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_task_comments;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workflow_task_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_task_attachments;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workflow_task_checklists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_task_checklists;
  END IF;
END $$;