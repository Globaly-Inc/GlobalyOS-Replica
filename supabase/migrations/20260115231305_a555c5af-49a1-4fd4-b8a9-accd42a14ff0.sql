-- Remove the public RLS policy since we're now using edge function
DROP POLICY IF EXISTS "Public can check approval status by email" ON organizations;