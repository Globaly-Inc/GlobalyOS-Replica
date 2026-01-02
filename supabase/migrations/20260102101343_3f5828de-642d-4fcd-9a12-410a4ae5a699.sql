-- Fix: Require authentication to view support_screenshot_routes
DROP POLICY IF EXISTS "Authenticated users can view active routes" ON support_screenshot_routes;

CREATE POLICY "Authenticated users can view active routes"
  ON support_screenshot_routes
  FOR SELECT
  TO authenticated
  USING (is_active = true AND auth.uid() IS NOT NULL);