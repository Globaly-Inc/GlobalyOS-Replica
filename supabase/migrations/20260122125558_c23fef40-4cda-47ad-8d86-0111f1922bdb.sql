-- Add new columns for structured horoscope data
ALTER TABLE daily_horoscopes 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS summary_paragraph text,
ADD COLUMN IF NOT EXISTS aspects jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'ai';

-- Create index for faster lookups by sign and date
CREATE INDEX IF NOT EXISTS idx_daily_horoscopes_lookup 
ON daily_horoscopes(zodiac_sign, horoscope_date);