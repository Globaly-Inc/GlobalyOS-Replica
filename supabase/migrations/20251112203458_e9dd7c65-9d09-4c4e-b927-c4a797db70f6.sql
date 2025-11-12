-- =====================================================
-- Security Fix Migration
-- Addresses: kudos_impersonation and no_rbac_system
-- =====================================================

-- =====================================================
-- PART 1: Fix Kudos Impersonation Vulnerability
-- =====================================================

-- Drop existing permissive kudos INSERT policy
DROP POLICY IF EXISTS "Authenticated users can give kudos" ON kudos;

-- Create new policy that verifies given_by_id matches authenticated user
CREATE POLICY "Users can give kudos as themselves" ON kudos
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  given_by_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- PART 2: Fix Updates Impersonation (similar issue)
-- =====================================================

-- Drop existing permissive updates INSERT policy
DROP POLICY IF EXISTS "Authenticated users can post updates" ON updates;

-- Create new policy that verifies employee_id matches authenticated user
CREATE POLICY "Users can post updates as themselves" ON updates
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- PART 3: Implement Role-Based Access Control (RBAC)
-- =====================================================

-- Create role enum for the application
CREATE TYPE app_role AS ENUM ('admin', 'hr', 'user');

-- Create user_roles table to manage role assignments
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles" ON user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles" ON user_roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =====================================================
-- PART 4: Update Employees Table Policies with RBAC
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can insert employees" ON employees;
DROP POLICY IF EXISTS "Users can update employees" ON employees;
DROP POLICY IF EXISTS "All authenticated users can view employees" ON employees;

-- Everyone can view employee directory (read-only public directory)
CREATE POLICY "All authenticated users can view employees" ON employees
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only HR and admins can create employee records
CREATE POLICY "HR and admins can create employees" ON employees
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Only HR and admins can update employee records
CREATE POLICY "HR and admins can update employees" ON employees
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Only admins can delete employee records
CREATE POLICY "Admins can delete employees" ON employees
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- PART 5: Update Achievements Table Policies with RBAC
-- =====================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Authenticated users can create achievements" ON achievements;

-- Only HR and admins can create achievements
CREATE POLICY "HR and admins can create achievements" ON achievements
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Only HR and admins can update achievements
CREATE POLICY "HR and admins can update achievements" ON achievements
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Only admins can delete achievements
CREATE POLICY "Admins can delete achievements" ON achievements
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));