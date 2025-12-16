-- Fix 1: Drop the problematic policy that causes infinite recursion on chat_space_members
-- The existing "chat_space_members_select" policy uses is_space_member() security definer function correctly
DROP POLICY IF EXISTS "Users can view members of accessible spaces" ON public.chat_space_members;

-- Fix 2: Ensure users can always view their own profile (prevents permission denied errors)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);