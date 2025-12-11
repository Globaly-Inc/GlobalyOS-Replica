-- Drop the overly permissive policy that exposes all employee data to org members
DROP POLICY IF EXISTS "Org members can view employees in their organization" ON public.employees;
DROP POLICY IF EXISTS "Org members can view basic employee info" ON public.employees;

-- Create a secure view for employee directory that only exposes non-sensitive columns
DROP VIEW IF EXISTS public.employee_directory;
CREATE VIEW public.employee_directory AS
SELECT 
  e.id,
  e.user_id,
  e.organization_id,
  e.position,
  e.department,
  e.office_id,
  e.manager_id,
  e.join_date,
  e.status,
  e.superpowers,
  e.created_at,
  e.updated_at
FROM public.employees e
WHERE is_org_member(auth.uid(), e.organization_id);

-- Grant access to the view for authenticated users
GRANT SELECT ON public.employee_directory TO authenticated;

-- Create a function that returns employee data based on viewer's role
-- This protects sensitive fields at the database level
DROP FUNCTION IF EXISTS public.get_employee_for_viewer(uuid);
CREATE FUNCTION public.get_employee_for_viewer(target_employee_id uuid)
RETURNS TABLE (
  emp_id uuid,
  emp_user_id uuid,
  emp_organization_id uuid,
  emp_position text,
  emp_department text,
  emp_office_id uuid,
  emp_manager_id uuid,
  emp_join_date date,
  emp_status text,
  emp_superpowers text[],
  emp_created_at timestamptz,
  emp_phone text,
  emp_personal_email text,
  emp_street text,
  emp_city text,
  emp_state text,
  emp_postcode text,
  emp_country text,
  emp_date_of_birth date,
  emp_salary numeric,
  emp_remuneration numeric,
  emp_remuneration_currency text,
  emp_id_number text,
  emp_tax_number text,
  emp_bank_details text,
  emp_emergency_contact_name text,
  emp_emergency_contact_phone text,
  emp_emergency_contact_relationship text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id uuid := auth.uid();
  viewer_employee_id uuid;
  target_org_id uuid;
  can_view_sensitive boolean := false;
BEGIN
  -- Get viewer's employee ID
  SELECT e.id INTO viewer_employee_id FROM employees e WHERE e.user_id = viewer_id LIMIT 1;
  
  -- Get target employee's org
  SELECT e.organization_id INTO target_org_id FROM employees e WHERE e.id = target_employee_id;
  
  -- Check if viewer is in same org
  IF NOT is_org_member(viewer_id, target_org_id) THEN
    RETURN;
  END IF;
  
  -- Check if viewer can see sensitive data
  SELECT (
    (SELECT e.user_id FROM employees e WHERE e.id = target_employee_id) = viewer_id
    OR has_role(viewer_id, 'hr'::app_role)
    OR has_role(viewer_id, 'admin'::app_role)
    OR (SELECT e.manager_id FROM employees e WHERE e.id = target_employee_id) = viewer_employee_id
  ) INTO can_view_sensitive;
  
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.organization_id,
    e.position,
    e.department,
    e.office_id,
    e.manager_id,
    e.join_date,
    e.status,
    e.superpowers,
    e.created_at,
    CASE WHEN can_view_sensitive THEN e.phone ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.personal_email ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.street ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.city ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.state ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.postcode ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.country ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.date_of_birth ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.salary ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.remuneration ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.remuneration_currency ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.id_number ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.tax_number ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.bank_details ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.emergency_contact_name ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.emergency_contact_phone ELSE NULL END,
    CASE WHEN can_view_sensitive THEN e.emergency_contact_relationship ELSE NULL END
  FROM employees e
  WHERE e.id = target_employee_id;
END;
$$;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.get_employee_for_viewer(uuid) TO authenticated;