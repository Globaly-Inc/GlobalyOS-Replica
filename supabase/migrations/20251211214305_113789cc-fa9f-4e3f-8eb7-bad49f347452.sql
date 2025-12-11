-- Drop all existing UPDATE policies on attendance_records
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can update own attendance today" ON public.attendance_records;

-- Create a proper permissive UPDATE policy for users on their own attendance
-- This allows updating all columns including work_hours
CREATE POLICY "Users can update own attendance" 
ON public.attendance_records 
FOR UPDATE 
TO authenticated
USING (is_own_employee(employee_id) AND date = CURRENT_DATE)
WITH CHECK (is_own_employee(employee_id) AND date = CURRENT_DATE);