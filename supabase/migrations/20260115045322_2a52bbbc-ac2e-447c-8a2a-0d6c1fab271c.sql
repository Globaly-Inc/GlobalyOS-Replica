-- Enable realtime for organizations table to support instant status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;