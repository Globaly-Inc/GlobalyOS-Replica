-- Fix otp_codes table security
-- The service role ALREADY bypasses RLS, so we don't need an "allow all" policy
-- Instead, deny all access from regular users - only edge functions should access this table

-- Drop the dangerous blanket policy
DROP POLICY IF EXISTS "Allow service role full access" ON public.otp_codes;

-- Create a policy that explicitly denies all access from regular users
-- (Service role bypasses RLS anyway, so this just protects against regular user access)
CREATE POLICY "Deny all direct access to otp_codes" 
ON public.otp_codes 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Also restrict the cleanup_expired_otps function since verify-otp handles cleanup
-- Remove the redundant function entirely as edge functions already clean up expired OTPs
DROP FUNCTION IF EXISTS public.cleanup_expired_otps();