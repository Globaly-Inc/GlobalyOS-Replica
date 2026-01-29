-- Allow organization members to SELECT employee records for directory and profile viewing
-- Sensitive fields are protected by:
-- 1. Using employee_directory view (excludes sensitive columns)
-- 2. Using get_employee_for_viewer() RPC (field-level masking)
-- The frontend MUST use these secure patterns, never query sensitive fields directly

CREATE POLICY "Org members can view org employees"
ON public.employees FOR SELECT
USING (is_org_member(auth.uid(), organization_id));