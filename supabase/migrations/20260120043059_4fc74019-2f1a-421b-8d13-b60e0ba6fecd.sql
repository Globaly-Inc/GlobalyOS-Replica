-- Add business_email and business_phone columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS business_email text,
ADD COLUMN IF NOT EXISTS business_phone text;