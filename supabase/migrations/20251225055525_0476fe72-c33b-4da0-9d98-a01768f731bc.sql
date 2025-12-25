-- Create table to cache daily horoscopes per zodiac sign
CREATE TABLE public.daily_horoscopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zodiac_sign TEXT NOT NULL,
  horoscope_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zodiac_sign, horoscope_date)
);

-- Enable RLS
ALTER TABLE public.daily_horoscopes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read horoscopes (they're generic per zodiac sign)
CREATE POLICY "Anyone can read horoscopes"
ON public.daily_horoscopes
FOR SELECT
TO authenticated
USING (true);

-- Allow edge functions to insert/update horoscopes via service role
CREATE POLICY "Service role can insert horoscopes"
ON public.daily_horoscopes
FOR INSERT
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX idx_daily_horoscopes_sign_date ON public.daily_horoscopes(zodiac_sign, horoscope_date);