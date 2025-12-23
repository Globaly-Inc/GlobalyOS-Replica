-- Create a secure server-side RPC for post creation
-- This derives employee_id and organization_id from auth.uid() server-side
-- bypassing any client-provided values that might cause RLS issues

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
  v_uid uuid;
  v_employee_id uuid;
  v_organization_id uuid;
  v_employee_status text;
  v_is_hr boolean;
  v_is_admin boolean;
  v_is_owner boolean;
  v_post_id uuid;
BEGIN
  -- Get authenticated user
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get employee record for this user
  SELECT id, organization_id, status
  INTO v_employee_id, v_organization_id, v_employee_status
  FROM public.employees
  WHERE user_id = v_uid
  LIMIT 1;
  
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'No employee profile found for this user';
  END IF;
  
  IF v_employee_status != 'active' THEN
    RAISE EXCEPTION 'Employee account is not active (status: %)', v_employee_status;
  END IF;
  
  -- Check roles for restricted post types
  v_is_hr := public.has_role(v_uid, 'hr'::app_role);
  v_is_admin := public.has_role(v_uid, 'admin'::app_role);
  v_is_owner := public.has_role(v_uid, 'owner'::app_role);
  
  -- Validate post type permissions
  IF _post_type = 'announcement' AND NOT (v_is_hr OR v_is_admin OR v_is_owner) THEN
    RAISE EXCEPTION 'Only HR, Admin, or Owner can create announcements';
  END IF;
  
  IF _post_type = 'executive' AND NOT (v_is_admin OR v_is_owner) THEN
    RAISE EXCEPTION 'Only Admin or Owner can create executive posts';
  END IF;
  
  -- Insert the post with server-derived values
  INSERT INTO public.posts (
    employee_id,
    organization_id,
    type,
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_post_for_current_user(text, text, text, timestamptz, boolean) TO authenticated;