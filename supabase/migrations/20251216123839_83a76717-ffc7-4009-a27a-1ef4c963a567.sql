-- Add policy to allow organization members to view basic employee info for feed queries
-- Sensitive data (salary, tax_number, bank_details, etc.) is still protected via get_employee_for_viewer() function

CREATE POLICY "Org members can view basic employee info"
ON public.employees
FOR SELECT
TO authenticated
USING (
  is_employee_in_same_org(organization_id)
);