-- Drop the legacy policy that causes infinite recursion
-- This policy directly queries chat_space_members within its own check
-- The correct policy "chat_space_members_insert" already exists and uses is_space_admin() SECURITY DEFINER function
DROP POLICY IF EXISTS "Space admins can manage members" ON public.chat_space_members;