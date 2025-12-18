-- Create indexes for optimizing the aggregation queries
CREATE INDEX IF NOT EXISTS idx_user_page_visits_user_visited 
  ON user_page_visits(user_id, visited_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created 
  ON user_activity_logs(user_id, created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_organization_members_user 
  ON organization_members(user_id);
  
CREATE INDEX IF NOT EXISTS idx_user_roles_user 
  ON user_roles(user_id);

-- Create the aggregated RPC function for admin users overview
CREATE OR REPLACE FUNCTION get_admin_users_overview()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  status TEXT,
  roles TEXT[],
  organizations JSONB,
  total_page_visits BIGINT,
  total_activities BIGINT,
  last_active_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can access this function
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    COALESCE(
      (SELECT e.status FROM employees e WHERE e.user_id = p.id LIMIT 1),
      'active'
    ) as status,
    COALESCE(
      (SELECT ARRAY_AGG(DISTINCT ur.role::TEXT) FROM user_roles ur WHERE ur.user_id = p.id),
      '{}'::TEXT[]
    ) as roles,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'slug', o.slug,
            'role', om.role
          )
        )
        FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = p.id
      ),
      '[]'::JSONB
    ) as organizations,
    (SELECT COUNT(*) FROM user_page_visits pv WHERE pv.user_id = p.id) as total_page_visits,
    (SELECT COUNT(*) FROM user_activity_logs al WHERE al.user_id = p.id) as total_activities,
    GREATEST(
      (SELECT MAX(pv.visited_at) FROM user_page_visits pv WHERE pv.user_id = p.id),
      (SELECT MAX(al.created_at) FROM user_activity_logs al WHERE al.user_id = p.id)
    ) as last_active_at
  FROM profiles p
  ORDER BY last_active_at DESC NULLS LAST;
END;
$$;