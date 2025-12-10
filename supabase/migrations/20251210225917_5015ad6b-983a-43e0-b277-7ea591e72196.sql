-- Allow employees to delete their own pending leave requests
CREATE POLICY "Users can delete own pending leave requests"
ON public.leave_requests
FOR DELETE
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  AND status = 'pending'
);