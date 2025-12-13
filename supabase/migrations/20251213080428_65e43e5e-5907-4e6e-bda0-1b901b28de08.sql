-- Add timezone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN timezone text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.timezone IS 'User preferred timezone (e.g., Asia/Kathmandu)';