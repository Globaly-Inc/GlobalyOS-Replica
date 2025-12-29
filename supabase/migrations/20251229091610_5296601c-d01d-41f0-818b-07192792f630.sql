-- Drop and recreate RLS policies to include owner role
DROP POLICY IF EXISTS "HR and admins can manage position history" ON public.position_history;
DROP POLICY IF EXISTS "HR and admins can view all position history" ON public.position_history;

CREATE POLICY "Owners, admins and HR can manage position history"
ON public.position_history
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role)
);

CREATE POLICY "Owners, admins and HR can view all position history"
ON public.position_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role)
);

-- Backfill existing records with NULL organization_id
UPDATE position_history ph
SET organization_id = e.organization_id
FROM employees e
WHERE ph.employee_id = e.id
AND ph.organization_id IS NULL;