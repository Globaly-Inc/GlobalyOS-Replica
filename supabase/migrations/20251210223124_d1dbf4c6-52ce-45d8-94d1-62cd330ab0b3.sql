-- Enable realtime for updates table
ALTER PUBLICATION supabase_realtime ADD TABLE public.updates;

-- Enable realtime for kudos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.kudos;

-- Enable realtime for leave_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;