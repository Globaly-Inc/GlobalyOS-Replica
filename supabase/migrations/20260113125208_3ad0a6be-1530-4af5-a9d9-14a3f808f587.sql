-- Allow inserting error logs even when not fully authenticated (for login/signup errors)
-- This allows errors during the authentication flow to be logged

DROP POLICY IF EXISTS "Users can insert error logs" ON user_error_logs;

CREATE POLICY "Anyone can insert error logs"
ON user_error_logs FOR INSERT
WITH CHECK (true);

-- Keep the select policy restricted to super admins only
-- (already exists from previous migration)