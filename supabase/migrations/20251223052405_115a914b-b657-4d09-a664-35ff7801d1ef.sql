-- Create a debug function to explain why post insertion may fail
-- This function is only usable by the authenticated user for their own employee_id (security)

CREATE OR REPLACE FUNCTION public.debug_can_insert_post(
  _employee_id uuid,
  _organization_id uuid,
  _post_type text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_auth_uid uuid;
  v_employee_match boolean;
  v_employee_active boolean;
  v_employee_org_matches boolean;
  v_user_id_from_employee uuid;
  v_has_role_owner boolean;
  v_has_role_admin boolean;
  v_has_role_hr boolean;
  v_allowed_by_post_type boolean;
BEGIN
  -- Get current auth user
  v_auth_uid := auth.uid();
  
  -- Security check: only allow debugging for the user's own employee record
  SELECT user_id INTO v_user_id_from_employee
  FROM employees
  WHERE id = _employee_id;
  
  IF v_user_id_from_employee IS NULL OR v_user_id_from_employee != v_auth_uid THEN
    RETURN jsonb_build_object(
      'error', 'Access denied: You can only debug your own employee record',
      'auth_uid', v_auth_uid::text,
      'employee_user_id', v_user_id_from_employee::text
    );
  END IF;
  
  -- Check employee matches and is active
  SELECT 
    EXISTS(SELECT 1 FROM employees WHERE id = _employee_id AND organization_id = _organization_id AND user_id = v_auth_uid),
    EXISTS(SELECT 1 FROM employees WHERE id = _employee_id AND organization_id = _organization_id AND user_id = v_auth_uid AND status = 'active'),
    EXISTS(SELECT 1 FROM employees WHERE id = _employee_id AND organization_id = _organization_id)
  INTO v_employee_match, v_employee_active, v_employee_org_matches;
  
  -- Check roles
  v_has_role_owner := has_role(v_auth_uid, 'owner'::app_role);
  v_has_role_admin := has_role(v_auth_uid, 'admin'::app_role);
  v_has_role_hr := has_role(v_auth_uid, 'hr'::app_role);
  
  -- Check post type permission
  v_allowed_by_post_type := (
    _post_type IN ('win', 'kudos', 'social')
    OR (_post_type = 'announcement' AND (v_has_role_owner OR v_has_role_admin OR v_has_role_hr))
    OR (_post_type = 'executive_message' AND (v_has_role_owner OR v_has_role_admin))
  );
  
  result := jsonb_build_object(
    'auth_uid', v_auth_uid::text,
    'employee_id', _employee_id::text,
    'organization_id', _organization_id::text,
    'post_type', _post_type,
    'employee_user_id', v_user_id_from_employee::text,
    'employee_org_matches', v_employee_org_matches,
    'employee_match', v_employee_match,
    'employee_active', v_employee_active,
    'has_role_owner', v_has_role_owner,
    'has_role_admin', v_has_role_admin,
    'has_role_hr', v_has_role_hr,
    'allowed_by_post_type', v_allowed_by_post_type,
    'would_pass_rls', (v_employee_match AND v_employee_active AND v_allowed_by_post_type)
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_can_insert_post(uuid, uuid, text) TO authenticated;