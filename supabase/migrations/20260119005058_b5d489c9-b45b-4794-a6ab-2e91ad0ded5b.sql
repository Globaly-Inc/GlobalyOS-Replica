-- Add country and business address fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_address_components JSONB;