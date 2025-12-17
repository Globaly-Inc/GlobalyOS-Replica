-- Allow all organization members to view approved leave requests (for team coordination)
-- This enables features like "On Leave Today" to show coworkers on leave
CREATE POLICY "Org members can view approved leave requests"
  ON leave_requests
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved' 
    AND is_org_member(auth.uid(), organization_id)
  );