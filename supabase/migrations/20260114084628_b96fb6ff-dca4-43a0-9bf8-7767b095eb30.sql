-- Drop potentially conflicting INSERT policies on chat_spaces
DROP POLICY IF EXISTS "Org members can create spaces" ON public.chat_spaces;
DROP POLICY IF EXISTS "chat_spaces_insert" ON public.chat_spaces;

-- Create single, correct INSERT policy using organization-scoped check
CREATE POLICY "Org members can create spaces"
ON public.chat_spaces
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be an active employee in this organization
  -- and the created_by must match their employee_id
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = organization_id
    AND e.id = created_by
    AND e.status = 'active'
  )
);