-- Allow all authenticated users to view approved leave requests (for "On Leave Today" visibility)
CREATE POLICY "All users can view approved leave requests"
ON public.leave_requests
FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'approved');