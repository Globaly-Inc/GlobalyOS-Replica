-- Security Fix: Drop overly permissive RLS policy on employees table
-- This policy allowed ANY org member to view ALL employee data including sensitive fields
-- (salary, tax_number, id_number, bank_details, emergency_contacts, etc.)
-- 
-- The secure alternatives are:
-- 1. employee_directory view - for non-sensitive directory listings
-- 2. get_employee_for_viewer() RPC - for profile views with field-level access control
-- 3. Existing proper policies for users/managers/HR/admins

DROP POLICY IF EXISTS "Org members can view basic employee info" ON employees;