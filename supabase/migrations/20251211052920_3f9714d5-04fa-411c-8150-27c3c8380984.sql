-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policy allowing users to update own profile OR admin/HR can update any profile
CREATE POLICY "Users can update own profile or admin/HR can update any" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'hr')
);