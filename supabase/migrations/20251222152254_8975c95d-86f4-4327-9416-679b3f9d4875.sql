-- Fix post_comments UPDATE policy to properly scope by organization
-- Problem: get_current_employee_id() returns the first employee for user without org scoping
-- Solution: Check employee_id matches an employee in the same organization as the comment

DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;

CREATE POLICY "Users can update own comments"
ON public.post_comments
FOR UPDATE
TO authenticated
USING (public.owns_comment(id))
WITH CHECK (
  employee_id IN (
    SELECT e.id FROM public.employees e 
    WHERE e.user_id = auth.uid() 
    AND e.organization_id = post_comments.organization_id
  )
);