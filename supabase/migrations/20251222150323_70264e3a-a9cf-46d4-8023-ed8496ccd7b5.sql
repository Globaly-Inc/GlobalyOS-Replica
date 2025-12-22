-- Allow HR, admins, and owners to update any comments (for soft delete)
CREATE POLICY "HR and admins can update any comments"
ON public.post_comments
FOR UPDATE
TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) AND (
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'hr'::app_role)
  )
)
WITH CHECK (
  is_org_member(auth.uid(), organization_id) AND (
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'hr'::app_role)
  )
);