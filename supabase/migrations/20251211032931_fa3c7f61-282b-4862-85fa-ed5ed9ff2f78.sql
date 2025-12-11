
-- Drop existing RESTRICTIVE SELECT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "All users can view approved leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "HR and admins can view all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Managers can view direct reports leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;

-- Recreate as PERMISSIVE policies (OR logic)
CREATE POLICY "All users can view approved leave requests" 
ON public.leave_requests 
FOR SELECT 
USING ((auth.uid() IS NOT NULL) AND (status = 'approved'));

CREATE POLICY "HR and admins can view all leave requests" 
ON public.leave_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view direct reports leave requests" 
ON public.leave_requests 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = leave_requests.employee_id) AND (e.manager_id IN ( SELECT employees.id
           FROM employees
          WHERE (employees.user_id = auth.uid()))))));

CREATE POLICY "Users can view own leave requests" 
ON public.leave_requests 
FOR SELECT 
USING (employee_id IN ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid())));
