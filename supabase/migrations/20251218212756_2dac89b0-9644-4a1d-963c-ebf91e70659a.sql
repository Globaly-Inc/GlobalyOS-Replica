-- Add module column to support_screenshots table
ALTER TABLE public.support_screenshots 
ADD COLUMN IF NOT EXISTS module text DEFAULT 'general';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_support_screenshots_module 
ON public.support_screenshots(module);