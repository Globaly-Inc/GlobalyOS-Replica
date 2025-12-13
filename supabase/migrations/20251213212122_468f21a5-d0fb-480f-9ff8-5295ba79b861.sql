-- Enable realtime for chat_attachments table
ALTER TABLE public.chat_attachments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_attachments;

-- Make the chat-attachments bucket public so files can be displayed
UPDATE storage.buckets SET public = true WHERE id = 'chat-attachments';