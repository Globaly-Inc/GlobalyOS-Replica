-- Add owner_phone column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS owner_phone TEXT;