-- Drop the problematic policy
DROP POLICY IF EXISTS "Allow first admin setup when no admins exist" ON public.user_roles;

-- Create a security definer function to check if any admin exists (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE role = 'admin'
  )
$$;

-- Now create the policy using the security definer function
CREATE POLICY "Allow first admin setup when no admins exist"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin'
  AND NOT public.admin_exists()
  AND user_id = auth.uid()
);