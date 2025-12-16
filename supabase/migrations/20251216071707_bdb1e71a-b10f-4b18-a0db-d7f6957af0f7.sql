-- Fix the INSERT policy on updates table to target authenticated role
DROP POLICY IF EXISTS "Users can post updates as themselves" ON updates;

CREATE POLICY "Users can post updates as themselves" ON updates
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND is_own_employee(employee_id));