-- Add the missing owner_profile column to org_onboarding_data table
ALTER TABLE public.org_onboarding_data 
ADD COLUMN IF NOT EXISTS owner_profile jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.org_onboarding_data.owner_profile IS 'Stores owner profile data during onboarding';