-- Fix the create_post_for_current_user RPC function to use correct column name 'post_type' instead of 'type'
CREATE OR REPLACE FUNCTION public.create_post_for_current_user(
  _post_type text,
  _content text,
  _access_scope text DEFAULT 'company',
  _scheduled_at timestamptz DEFAULT NULL,
  _is_published boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_employee_id uuid;
  v_organization_id uuid;
  v_employee_status text;
  v_is_hr boolean;
  v_is_admin boolean;
  v_is_owner boolean;
  v_post_id uuid;
BEGIN
  -- Get the current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get employee details for this user
  SELECT id, organization_id, status
  INTO v_employee_id, v_organization_id, v_employee_status
  FROM public.employees
  WHERE user_id = v_user_id
  LIMIT 1;
  
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee record not found for user';
  END IF;
  
  IF v_employee_status != 'active' THEN
    RAISE EXCEPTION 'Employee is not active';
  END IF;
  
  -- Check roles for post type permissions
  v_is_hr := has_role(v_user_id, 'hr'::app_role);
  v_is_admin := has_role(v_user_id, 'admin'::app_role);
  v_is_owner := has_role(v_user_id, 'owner'::app_role);
  
  -- Validate post type permissions
  IF _post_type = 'announcement' AND NOT (v_is_hr OR v_is_admin OR v_is_owner) THEN
    RAISE EXCEPTION 'Only HR, Admin, or Owner can post announcements';
  END IF;
  
  IF _post_type = 'executive' AND NOT (v_is_admin OR v_is_owner) THEN
    RAISE EXCEPTION 'Only Admin or Owner can post executive updates';
  END IF;
  
  -- Insert the post with server-derived values
  INSERT INTO public.posts (
    employee_id,
    organization_id,
    post_type,
    content,
    access_scope,
    scheduled_at,
    is_published
  )
  VALUES (
    v_employee_id,
    v_organization_id,
    _post_type,
    _content,
    _access_scope,
    _scheduled_at,
    COALESCE(_is_published, true)
  )
  RETURNING id INTO v_post_id;
  
  RETURN v_post_id;
END;
$$;