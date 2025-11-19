-- Allow first user to become admin when no admins exist
CREATE POLICY "Allow first admin setup when no admins exist"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserting admin role
  role = 'admin'
  AND
  -- Only when no admins exist yet
  NOT EXISTS (
    SELECT 1 FROM user_roles WHERE role = 'admin'
  )
  AND
  -- Only for yourself
  user_id = auth.uid()
);