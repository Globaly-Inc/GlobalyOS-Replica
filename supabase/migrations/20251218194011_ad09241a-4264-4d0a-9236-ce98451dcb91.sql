-- Add target_roles column to support_articles for role-based filtering
ALTER TABLE public.support_articles 
ADD COLUMN target_roles text[] DEFAULT ARRAY['owner', 'admin', 'hr', 'user'];

-- Add highlight columns to support_screenshots for annotated screenshots
ALTER TABLE public.support_screenshots 
ADD COLUMN highlight_selector text,
ADD COLUMN highlight_annotation text,
ADD COLUMN highlight_style text DEFAULT 'box';