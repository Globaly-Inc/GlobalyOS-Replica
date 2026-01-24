-- Fix the overly permissive profiles table RLS policies
-- The "Require authentication for all profile operations" policy with cmd=ALL
-- effectively allows any authenticated user to read all profiles

-- Drop the overly broad ALL policy
DROP POLICY IF EXISTS "Require authentication for all profile operations" ON public.profiles;

-- The existing SELECT policies are properly scoped:
-- 1. "Users can view own profile" - USING (auth.uid() = id)
-- 2. "Users can view profiles in same organization" - USING (can_view_profile(id)) - this enforces org isolation
-- 3. "Super admins can view all profiles" - USING (is_super_admin())

-- We need to add proper INSERT/UPDATE/DELETE policies since we removed the ALL policy

-- Ensure INSERT policy exists (it does)
-- The existing "Users can insert own profile" is correct

-- Ensure UPDATE policy exists (it does)  
-- The existing "Users can update own profile or admin/HR can update any" is correct

-- Add DELETE policy - only allow users to delete their own profile or admin/HR
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'hr'::app_role)
  )
);

-- Also update the UPDATE policy to include WITH CHECK clause for security
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
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'hr'::app_role)
  )
);