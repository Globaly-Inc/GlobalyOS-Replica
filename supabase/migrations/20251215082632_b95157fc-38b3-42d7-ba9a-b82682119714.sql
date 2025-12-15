-- Drop the overly permissive policy that exposes all employee sensitive data
DROP POLICY IF EXISTS "Org members can view employee directory" ON employees;

-- Add a comment explaining the security model
COMMENT ON TABLE employees IS 'Contains sensitive employee data. Access is restricted to: own record (users), direct reports (managers), all records (HR/admin). For non-sensitive directory listings, use the employee_directory view.';