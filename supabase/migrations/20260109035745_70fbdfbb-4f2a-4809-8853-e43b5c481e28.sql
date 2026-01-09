-- Update get_employee_for_viewer function to include last_working_day with HR/Admin-only access
CREATE OR REPLACE FUNCTION public.get_employee_for_viewer(
  p_employee_id uuid,
  p_viewer_id uuid
)
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
  emp_phone text,
  emp_personal_email text,
  emp_date_of_birth date,
  emp_gender text,
  emp_street text,
  emp_city text,
  emp_state text,
  emp_postcode text,
  emp_country text,
  emp_salary numeric,
  emp_remuneration numeric,
  emp_remuneration_currency text,
  emp_id_number text,
  emp_tax_number text,
  emp_bank_details text,
  emp_emergency_contact_name text,
  emp_emergency_contact_phone text,
  emp_emergency_contact_relationship text,
  emp_position_effective_date date,
  emp_last_working_day date,
  emp_contract_end_date date,
  emp_resignation_submitted_at timestamptz,
  emp_is_new_hire boolean,
  emp_created_at timestamptz,
  emp_updated_at timestamptz,
  profile_full_name text,
  profile_avatar_url text,
  profile_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_employee_id uuid;
  v_is_self boolean;
  v_is_manager boolean;
  v_is_hr_or_admin boolean;
  v_target_org_id uuid;
  v_viewer_org_id uuid;
BEGIN
  -- Get the target employee's organization
  SELECT organization_id INTO v_target_org_id
  FROM employees WHERE id = p_employee_id;
  
  -- Get viewer's employee record
  SELECT e.id, e.organization_id INTO v_viewer_employee_id, v_viewer_org_id
  FROM employees e
  WHERE e.user_id = p_viewer_id AND e.organization_id = v_target_org_id;
  
  -- Security check: viewer must be in same org
  IF v_viewer_org_id IS NULL OR v_viewer_org_id != v_target_org_id THEN
    RETURN;
  END IF;
  
  -- Determine viewer's relationship to target
  v_is_self := v_viewer_employee_id = p_employee_id;
  
  -- Check if viewer is manager of target
  SELECT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = p_employee_id AND manager_id = v_viewer_employee_id
  ) INTO v_is_manager;
  
  -- Check if viewer has HR or Admin or Owner role
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = p_viewer_id 
    AND ur.role IN ('hr', 'admin', 'owner')
  ) INTO v_is_hr_or_admin;
  
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
    e.phone,
    e.personal_email,
    e.date_of_birth,
    e.gender,
    e.street,
    e.city,
    e.state,
    e.postcode,
    e.country,
    -- Financial fields: only for self, HR, or admin
    CASE WHEN v_is_self OR v_is_hr_or_admin THEN e.salary ELSE NULL END,
    CASE WHEN v_is_self OR v_is_hr_or_admin THEN e.remuneration ELSE NULL END,
    CASE WHEN v_is_self OR v_is_hr_or_admin THEN e.remuneration_currency ELSE NULL END,
    CASE WHEN v_is_self OR v_is_hr_or_admin THEN e.id_number ELSE NULL END,
    CASE WHEN v_is_self OR v_is_hr_or_admin THEN e.tax_number ELSE NULL END,
    CASE WHEN v_is_self OR v_is_hr_or_admin THEN e.bank_details ELSE NULL END,
    -- Emergency contact: visible to self, manager, HR, admin
    CASE WHEN v_is_self OR v_is_manager OR v_is_hr_or_admin THEN e.emergency_contact_name ELSE NULL END,
    CASE WHEN v_is_self OR v_is_manager OR v_is_hr_or_admin THEN e.emergency_contact_phone ELSE NULL END,
    CASE WHEN v_is_self OR v_is_manager OR v_is_hr_or_admin THEN e.emergency_contact_relationship ELSE NULL END,
    e.position_effective_date,
    -- Offboarding fields: only for HR or admin
    CASE WHEN v_is_hr_or_admin THEN e.last_working_day ELSE NULL END,
    CASE WHEN v_is_hr_or_admin THEN e.contract_end_date ELSE NULL END,
    CASE WHEN v_is_hr_or_admin THEN e.resignation_submitted_at ELSE NULL END,
    e.is_new_hire,
    e.created_at,
    e.updated_at,
    p.full_name,
    p.avatar_url,
    p.email
  FROM employees e
  JOIN profiles p ON e.user_id = p.id
  WHERE e.id = p_employee_id;
END;
$$;