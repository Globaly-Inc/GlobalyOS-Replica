-- Fix updates table INSERT policy to use EXISTS instead of function call
-- This prevents NULL comparison issues that cause RLS violations

DROP POLICY IF EXISTS "Users can post updates as themselves" ON public.updates;

CREATE POLICY "Users can post updates as themselves"
ON public.updates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id 
    AND e.organization_id = updates.organization_id
    AND e.user_id = auth.uid()
  )
);

-- Also fix the kudos table INSERT policy with the same pattern
DROP POLICY IF EXISTS "Users can give kudos as themselves" ON public.kudos;

CREATE POLICY "Users can give kudos as themselves"
ON public.kudos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = given_by_id 
    AND e.organization_id = kudos.organization_id
    AND e.user_id = auth.uid()
  )
);