
-- Drop the restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_records;

-- Create a permissive UPDATE policy with proper WITH CHECK
CREATE POLICY "Users can update own attendance" 
ON public.attendance_records 
FOR UPDATE 
TO authenticated
USING (is_own_employee(employee_id) AND (date = CURRENT_DATE))
WITH CHECK (is_own_employee(employee_id) AND (date = CURRENT_DATE));
