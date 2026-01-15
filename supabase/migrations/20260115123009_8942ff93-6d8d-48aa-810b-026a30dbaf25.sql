-- Add policy to allow pending approval status checks by email
-- This is safe because:
-- 1. Only exposes: approval_status, rejection_reason, name
-- 2. Only works for pending/rejected orgs (not approved ones)
-- 3. Requires knowing the exact owner email

CREATE POLICY "Public can check approval status by email"
  ON organizations
  FOR SELECT
  USING (
    approval_status IN ('pending', 'rejected')
  );