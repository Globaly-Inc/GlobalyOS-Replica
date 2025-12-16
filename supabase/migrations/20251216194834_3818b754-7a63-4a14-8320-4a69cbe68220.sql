-- Remove overly permissive RLS policy that allows all authenticated users to view approved leave requests
DROP POLICY IF EXISTS "All users can view approved leave requests" ON public.leave_requests;

-- Ensure owner role is included in the HR/admin view all policy (drop and recreate to be safe)
DROP POLICY IF EXISTS "HR and admins can view all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Owner, HR and admins can view all leave requests" ON public.leave_requests;

CREATE POLICY "Owner, HR and admins can view all leave requests"
ON public.leave_requests FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);