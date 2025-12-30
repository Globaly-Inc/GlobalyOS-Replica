-- Drop and recreate the can_insert_post function to allow 'update' post type
-- First drop the dependent policy, then the function, then recreate both

-- Drop the INSERT policy that depends on the function
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;

-- Now drop and recreate the function with 'update' support
DROP FUNCTION IF EXISTS public.can_insert_post(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.can_insert_post(_employee_id uuid, _organization_id uuid, _post_type text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  -- Get the current user id
  v_user_id := auth.uid();
  
  -- If no authenticated user, deny
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the employee belongs to the organization
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = _employee_id 
    AND organization_id = _organization_id 
    AND user_id = v_user_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Get user role
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = v_user_id
  AND organization_id = _organization_id;
  
  -- Win, kudos, social, and update posts can be created by anyone
  IF _post_type IN ('win', 'kudos', 'social', 'update') THEN
    RETURN true;
  END IF;
  
  -- Announcement posts require admin, hr, or owner role
  IF _post_type = 'announcement' THEN
    RETURN v_user_role IN ('admin', 'hr', 'owner');
  END IF;
  
  -- Executive message posts require admin or owner role
  IF _post_type = 'executive_message' THEN
    RETURN v_user_role IN ('admin', 'owner');
  END IF;
  
  -- Default deny for unknown post types
  RETURN false;
END;
$$;

-- Recreate the INSERT policy
CREATE POLICY "Users can create posts" ON public.posts
FOR INSERT
WITH CHECK (
  can_insert_post(employee_id, organization_id, post_type)
);