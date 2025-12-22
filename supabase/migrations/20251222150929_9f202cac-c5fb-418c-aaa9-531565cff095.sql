-- Drop the existing policy that lacks explicit WITH CHECK
DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;

-- Recreate with explicit WITH CHECK clause
CREATE POLICY "Users can update own comments"
ON public.post_comments
FOR UPDATE
TO authenticated
USING (owns_comment(id))
WITH CHECK (owns_comment(id));