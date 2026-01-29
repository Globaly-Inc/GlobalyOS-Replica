-- First drop the existing function to allow changing the return type
DROP FUNCTION IF EXISTS public.get_employee_for_viewer(uuid);

-- Recreate with the additional fields
CREATE OR REPLACE FUNCTION public.get_employee_for_viewer(target_employee_id uuid)
RETURNS TABLE(
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
  emp_created_at timestamp with time zone, 
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
  emp_emergency_contact_relationship text,
  emp_employment_type text,
  emp_position_effective_date date,
  emp_gender text,
  emp_last_working_day date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id uuid := auth.uid();
  viewer_employee_id uuid;
  target_org_id uuid;
  is_self boolean := false;
  is_hr_or_admin boolean := false;
  is_owner boolean := false;
  is_manager boolean := false;
  can_view_personal boolean := false;
  can_view_financial boolean := false;
  can_view_offboarding boolean := false;
BEGIN
  -- Get viewer's employee ID
  SELECT e.id INTO viewer_employee_id FROM employees e WHERE e.user_id = viewer_id LIMIT 1;
  
  -- Get target employee's org
  SELECT e.organization_id INTO target_org_id FROM employees e WHERE e.id = target_employee_id;
  
  -- Check if viewer is in same org
  IF NOT is_org_member(viewer_id, target_org_id) THEN
    RETURN;
  END IF;
  
  -- Check viewer's relationship to target employee
  is_self := (SELECT e.user_id FROM employees e WHERE e.id = target_employee_id) = viewer_id;
  is_hr_or_admin := has_role(viewer_id, 'hr'::app_role) OR has_role(viewer_id, 'admin'::app_role);
  is_owner := has_role(viewer_id, 'owner'::app_role);
  is_manager := (SELECT e.manager_id FROM employees e WHERE e.id = target_employee_id) = viewer_employee_id;
  
  -- Personal data access: self, HR, admin, owner, or direct manager
  can_view_personal := is_self OR is_hr_or_admin OR is_owner OR is_manager;
  
  -- Financial data access: ONLY self, HR, admin, or owner (NOT managers)
  can_view_financial := is_self OR is_hr_or_admin OR is_owner;
  
  -- Offboarding data (last_working_day): ONLY owner, admin, or HR
  can_view_offboarding := is_owner OR is_hr_or_admin;
  
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
    -- Personal data: visible to self, HR, admin, owner, and managers
    CASE WHEN can_view_personal THEN e.phone ELSE NULL END,
    CASE WHEN can_view_personal THEN e.personal_email ELSE NULL END,
    CASE WHEN can_view_personal THEN e.street ELSE NULL END,
    CASE WHEN can_view_personal THEN e.city ELSE NULL END,
    CASE WHEN can_view_personal THEN e.state ELSE NULL END,
    CASE WHEN can_view_personal THEN e.postcode ELSE NULL END,
    CASE WHEN can_view_personal THEN e.country ELSE NULL END,
    CASE WHEN can_view_personal THEN e.date_of_birth ELSE NULL END,
    -- Financial data: visible ONLY to self, HR, admin, owner (NOT managers)
    CASE WHEN can_view_financial THEN e.salary ELSE NULL END,
    CASE WHEN can_view_financial THEN e.remuneration ELSE NULL END,
    CASE WHEN can_view_financial THEN e.remuneration_currency ELSE NULL END,
    CASE WHEN can_view_financial THEN e.id_number ELSE NULL END,
    CASE WHEN can_view_financial THEN e.tax_number ELSE NULL END,
    CASE WHEN can_view_financial THEN e.bank_details ELSE NULL END,
    -- Emergency contacts: visible to self, HR, admin, owner, and managers
    CASE WHEN can_view_personal THEN e.emergency_contact_name ELSE NULL END,
    CASE WHEN can_view_personal THEN e.emergency_contact_phone ELSE NULL END,
    CASE WHEN can_view_personal THEN e.emergency_contact_relationship ELSE NULL END,
    -- Non-sensitive fields - always visible to org members
    e.employment_type,
    e.position_effective_date,
    e.gender,
    -- Offboarding fields: visible ONLY to owner, admin, HR
    CASE WHEN can_view_offboarding THEN e.last_working_day ELSE NULL END
  FROM employees e
  WHERE e.id = target_employee_id;
END;
$$;