-- Add highlight_selector column to support_screenshots if not exists
ALTER TABLE public.support_screenshots 
ADD COLUMN IF NOT EXISTS highlight_selector TEXT;

-- Enable realtime for support_screenshots table
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_screenshots;