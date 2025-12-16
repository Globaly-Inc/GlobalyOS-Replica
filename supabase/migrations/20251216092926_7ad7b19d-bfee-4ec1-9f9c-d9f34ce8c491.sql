-- Fix announcement posting: align updates INSERT RLS check with org-scoped employee resolution

BEGIN;

-- Replace INSERT policy to avoid false negatives from is_own_employee() in some contexts
DROP POLICY IF EXISTS "Users can post updates as themselves" ON public.updates;

CREATE POLICY "Users can post updates as themselves"
ON public.updates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND employee_id = public.get_current_employee_id_for_org(organization_id)
);

COMMIT;