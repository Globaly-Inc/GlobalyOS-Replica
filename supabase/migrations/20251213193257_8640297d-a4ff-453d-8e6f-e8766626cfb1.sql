-- Create a function to check if a user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Grant super_admin role to amit@globalyhub.com
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'super_admin'::app_role
FROM public.profiles p
WHERE p.email = 'amit@globalyhub.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create RLS policies for super admin access to organizations
CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can update all organizations"
ON public.organizations
FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins can delete organizations"
ON public.organizations
FOR DELETE
USING (is_super_admin());

-- Create RLS policies for super admin access to organization_members
CREATE POLICY "Super admins can view all org members"
ON public.organization_members
FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can manage all org members"
ON public.organization_members
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create RLS policies for super admin access to profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin());

-- Create RLS policies for super admin access to employees
CREATE POLICY "Super admins can view all employees"
ON public.employees
FOR SELECT
USING (is_super_admin());

-- Create RLS policies for super admin access to user_roles
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_super_admin());