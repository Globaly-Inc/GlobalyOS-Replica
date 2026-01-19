ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
ADD COLUMN IF NOT EXISTS business_registration_number TEXT;