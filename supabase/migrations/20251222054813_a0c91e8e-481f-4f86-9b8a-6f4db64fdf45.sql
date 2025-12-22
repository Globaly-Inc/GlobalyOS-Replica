-- Create a helper function to verify update ownership
CREATE OR REPLACE FUNCTION public.can_insert_update(_employee_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = _employee_id
      AND e.organization_id = _organization_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
  )
$$;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can post updates as themselves" ON public.updates;

-- Create a new policy using the security definer function
CREATE POLICY "Users can post updates as themselves"
ON public.updates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND can_insert_update(employee_id, organization_id)
);