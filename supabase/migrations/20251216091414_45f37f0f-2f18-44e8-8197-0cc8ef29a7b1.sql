
-- Fix RLS policies for updates and kudos tables
-- The policies were calling functions with wrong number of arguments

-- Drop and recreate the SELECT policy for updates
DROP POLICY IF EXISTS "Users can view accessible updates" ON updates;
CREATE POLICY "Users can view accessible updates" ON updates
  FOR SELECT USING (can_view_update(auth.uid(), id));

-- Drop and recreate the SELECT policy for kudos
DROP POLICY IF EXISTS "Users can view accessible kudos" ON kudos;
CREATE POLICY "Users can view accessible kudos" ON kudos
  FOR SELECT USING (can_view_kudos(auth.uid(), id));
