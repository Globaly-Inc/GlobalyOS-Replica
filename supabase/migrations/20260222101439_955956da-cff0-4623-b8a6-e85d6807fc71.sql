
-- Fix DELETE policy: scope to authenticated role instead of public
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
  );

-- Fix UPDATE policy: scope to authenticated role instead of public
DROP POLICY IF EXISTS "Users can update own profile or admin/HR can update any" ON public.profiles;
CREATE POLICY "Users can update own profile or admin/HR can update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
  )
  WITH CHECK (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
  );

-- Add explicit deny for anonymous access as defense-in-depth
CREATE POLICY "Deny anonymous access to profiles"
  ON public.profiles AS RESTRICTIVE FOR SELECT
  TO anon
  USING (false);
