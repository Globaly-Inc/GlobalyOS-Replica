-- Drop the overly permissive policy that exposes sensitive employee data
-- The system already has proper access controls:
-- 1. employee_directory view for non-sensitive directory listings
-- 2. get_employee_for_viewer function for column-level security on profiles
-- 3. Specific policies for HR/admin, managers, and self-access

DROP POLICY IF EXISTS "Org members can view employees in same org" ON public.employees;