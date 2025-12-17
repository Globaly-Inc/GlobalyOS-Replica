-- Enable REPLICA IDENTITY for complete row data during updates
ALTER TABLE public.kpis REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.kpis;