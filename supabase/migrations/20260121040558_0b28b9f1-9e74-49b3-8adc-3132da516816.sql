-- Add geolocation and Google Maps data to offices
ALTER TABLE public.offices 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Add index for future geospatial queries
CREATE INDEX IF NOT EXISTS idx_offices_location 
ON public.offices (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add location columns to organizations (for HQ)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Add location columns to employees (for home address)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;