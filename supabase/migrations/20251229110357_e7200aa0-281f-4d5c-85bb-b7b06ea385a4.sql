-- Allow all organization members to view position history
-- (sensitive data like salary/notes is filtered in frontend based on user role)
CREATE POLICY "Organization members can view position history"
ON public.position_history
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  )
);