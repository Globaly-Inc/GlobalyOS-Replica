-- Enable realtime for user_error_logs table
ALTER TABLE public.user_error_logs REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_error_logs;

-- Delete the duplicate error log entries
DELETE FROM public.user_error_logs 
WHERE id IN (
  'f3d6ac16-8859-4375-bb54-7ab670c14b1b',
  'ac586ddc-5085-45e6-989b-f4b000d580c5'
);