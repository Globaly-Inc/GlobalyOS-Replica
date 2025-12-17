-- Drop the existing policy
DROP POLICY IF EXISTS "HR and admins can manage schedules" ON employee_schedules;

-- Create updated policy that includes owner role
CREATE POLICY "Owner, HR and admins can manage schedules"
ON employee_schedules
FOR ALL
USING (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);