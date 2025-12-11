-- Add explicit authentication-required base policies for extra security

-- Profiles table: Require authentication for all operations
CREATE POLICY "Require authentication for profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Employees table: Require authentication for all operations  
CREATE POLICY "Require authentication for employees"
ON public.employees
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);