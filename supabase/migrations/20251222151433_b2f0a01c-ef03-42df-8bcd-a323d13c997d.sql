-- Fix post_comments UPDATE policy to avoid recursive owns_comment() in WITH CHECK
--
-- Problem: owns_comment() queries post_comments; when used in WITH CHECK during soft-delete updates,
-- it can be affected by SELECT RLS (e.g., hiding is_deleted = true rows), causing UPDATE to fail.
-- Solution: keep USING ownership check, but make WITH CHECK a direct employee_id comparison.

DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;

CREATE POLICY "Users can update own comments"
ON public.post_comments
FOR UPDATE
TO authenticated
USING (public.owns_comment(id))
WITH CHECK (employee_id = public.get_current_employee_id());
