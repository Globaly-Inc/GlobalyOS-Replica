-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;

-- Create a new policy that only allows authenticated users to read coupons
-- This prevents anonymous users from discovering coupon codes
CREATE POLICY "Authenticated users can read active coupons" 
ON public.coupons 
FOR SELECT 
TO authenticated
USING (is_active = true);