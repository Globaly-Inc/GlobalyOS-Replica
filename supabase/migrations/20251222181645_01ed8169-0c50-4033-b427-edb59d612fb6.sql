-- Add AI-generated position description and responsibilities columns to positions table
ALTER TABLE public.positions
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS responsibilities TEXT[],
ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.positions.description IS 'AI-generated or manually entered job description';
COMMENT ON COLUMN public.positions.responsibilities IS 'Array of key responsibilities for the position';
COMMENT ON COLUMN public.positions.ai_generated_at IS 'Timestamp when AI last generated the description';