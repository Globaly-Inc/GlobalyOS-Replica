-- Add source_text column to store original API Ninjas horoscope text
ALTER TABLE daily_horoscopes ADD COLUMN IF NOT EXISTS source_text TEXT;