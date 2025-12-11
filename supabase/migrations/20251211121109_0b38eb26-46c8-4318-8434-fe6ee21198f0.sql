-- Fix profiles table to explicitly block unauthenticated access
-- Add explicit auth.uid() IS NOT NULL check for defense in depth

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view org member profiles" ON public.profiles;

-- Create new SELECT policy with explicit authentication check
CREATE POLICY "Users can view org member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    id = auth.uid() 
    OR id IN (
      SELECT e.user_id
      FROM employees e
      WHERE e.organization_id IN (
        SELECT employees.organization_id
        FROM employees
        WHERE employees.user_id = auth.uid()
      )
    )
  )
);

-- Update INSERT policy to ensure authenticated
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Update UPDATE policy to ensure authenticated  
DROP POLICY IF EXISTS "Users can update own profile or admin/HR can update any" ON public.profiles;
CREATE POLICY "Users can update own profile or admin/HR can update any" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'hr'::app_role)
  )
);