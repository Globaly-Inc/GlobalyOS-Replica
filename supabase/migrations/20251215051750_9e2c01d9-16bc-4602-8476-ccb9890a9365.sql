-- Update has_role function to support owner hierarchy
-- Owner has all privileges of admin, hr, and user
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id 
    AND (
      role = _role 
      -- Owner inherits all other roles
      OR (role = 'owner' AND _role IN ('admin', 'hr', 'user'))
      -- Admin inherits hr and user
      OR (role = 'admin' AND _role IN ('hr', 'user'))
      -- HR inherits user
      OR (role = 'hr' AND _role = 'user')
    )
  )
$$;

-- Create is_owner helper function
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'
  )
$$;

-- Update amit@globalyhub.com role from 'admin' to 'owner'
UPDATE user_roles 
SET role = 'owner' 
WHERE user_id = '8eaf9481-14a2-4e50-b28d-21b68a87226c' 
AND organization_id = '11111111-1111-1111-1111-111111111111'
AND role = 'admin';