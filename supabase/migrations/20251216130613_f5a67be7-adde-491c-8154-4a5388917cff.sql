-- Drop and recreate leave_balance_logs policies to include owner role
DROP POLICY IF EXISTS "HR and admins can manage leave balance logs" ON public.leave_balance_logs;

CREATE POLICY "Owner, HR and admins can manage leave balance logs"
ON public.leave_balance_logs FOR ALL
TO authenticated
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

-- Drop and recreate leave_requests management policy to include owner role
DROP POLICY IF EXISTS "HR and admins can manage all leave requests" ON public.leave_requests;

CREATE POLICY "Owner, HR and admins can manage all leave requests"
ON public.leave_requests FOR ALL
TO authenticated
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