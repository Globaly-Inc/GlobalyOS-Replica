-- ============================================
-- Employee Activity Timeline RPC
-- Aggregates events from multiple sources with role-based access
-- ============================================

CREATE OR REPLACE FUNCTION get_employee_activity_timeline(
  target_employee_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_event_types TEXT[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_category TEXT,
  title TEXT,
  description TEXT,
  actor_id UUID,
  actor_name TEXT,
  actor_avatar TEXT,
  event_timestamp TIMESTAMPTZ,
  metadata JSONB,
  access_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_user_id UUID;
  viewer_employee_id UUID;
  viewer_org_id UUID;
  is_admin_hr BOOLEAN;
  is_own_profile BOOLEAN;
  is_direct_manager BOOLEAN;
BEGIN
  -- Get authenticated user
  viewer_user_id := auth.uid();
  IF viewer_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get viewer's employee record and org
  SELECT e.id, e.organization_id 
  INTO viewer_employee_id, viewer_org_id
  FROM employees e 
  WHERE e.user_id = viewer_user_id
  LIMIT 1;
  
  IF viewer_employee_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check permissions
  is_admin_hr := has_role(viewer_user_id, 'admin') 
    OR has_role(viewer_user_id, 'hr') 
    OR has_role(viewer_user_id, 'owner');
  
  is_own_profile := viewer_employee_id = target_employee_id;
  
  is_direct_manager := EXISTS (
    SELECT 1 FROM employees 
    WHERE id = target_employee_id 
    AND manager_id = viewer_employee_id
  );
  
  -- Access denied if not authorized
  IF NOT (is_admin_hr OR is_own_profile OR is_direct_manager) THEN
    RETURN;
  END IF;
  
  -- Return aggregated events from multiple sources
  RETURN QUERY
  WITH target_employee AS (
    SELECT e.id, e.user_id, e.organization_id, e.join_date, e.status, e.created_at, e.updated_at
    FROM employees e
    WHERE e.id = target_employee_id
  ),
  all_events AS (
    -- Profile activation event
    SELECT 
      gen_random_uuid() as event_id,
      'profile_activated'::TEXT as event_type,
      'profile'::TEXT as event_category,
      'Profile Activated'::TEXT as title,
      'Joined the team and activated their account'::TEXT as description,
      te.user_id as actor_id,
      te.updated_at as event_timestamp,
      jsonb_build_object('status', te.status) as metadata,
      'public'::TEXT as access_level
    FROM target_employee te
    WHERE te.status = 'active'
    
    UNION ALL
    
    -- Joined organization event
    SELECT 
      gen_random_uuid(),
      'joined_organization',
      'profile',
      'Joined Organization',
      'Became a team member',
      te.user_id,
      te.join_date::TIMESTAMPTZ,
      jsonb_build_object('join_date', te.join_date),
      'public'
    FROM target_employee te
    WHERE te.join_date IS NOT NULL
    
    UNION ALL
    
    -- Position history
    SELECT 
      ph.id,
      CASE ph.change_type 
        WHEN 'promotion' THEN 'position_changed'
        WHEN 'hire' THEN 'joined_organization'
        ELSE 'position_changed'
      END,
      'profile',
      CASE ph.change_type 
        WHEN 'promotion' THEN 'Promotion'
        WHEN 'hire' THEN 'Hired'
        ELSE 'Position Change'
      END,
      COALESCE(ph.position, '') || ' in ' || COALESCE(ph.department, ''),
      te.user_id,
      ph.effective_date::TIMESTAMPTZ,
      jsonb_build_object(
        'position', ph.position,
        'department', ph.department,
        'change_type', ph.change_type,
        'notes', ph.notes
      ),
      'manager'
    FROM position_history ph
    JOIN target_employee te ON te.id = ph.employee_id
    
    UNION ALL
    
    -- Kudos received
    SELECT 
      k.id,
      'kudos_received',
      'recognition',
      'Received Kudos',
      k.comment,
      e.user_id,
      k.created_at,
      jsonb_build_object('kudos_id', k.id),
      'public'
    FROM kudos k
    JOIN employees e ON e.id = k.given_by_id
    WHERE k.employee_id = target_employee_id
    
    UNION ALL
    
    -- Achievements
    SELECT 
      a.id,
      'achievement_unlocked',
      'recognition',
      'Achievement Unlocked',
      a.title || ': ' || a.description,
      te.user_id,
      a.achieved_at::TIMESTAMPTZ,
      jsonb_build_object('achievement_id', a.id, 'title', a.title),
      'public'
    FROM achievements a
    JOIN target_employee te ON te.id = a.employee_id
    
    UNION ALL
    
    -- Leave requests (approved only for now)
    SELECT 
      lr.id,
      CASE lr.status
        WHEN 'approved' THEN 'leave_approved'
        WHEN 'rejected' THEN 'leave_rejected'
        WHEN 'pending' THEN 'leave_requested'
        ELSE 'leave_requested'
      END,
      'leave',
      lr.leave_type || ' ' || CASE 
        WHEN lr.status = 'approved' THEN 'Approved'
        WHEN lr.status = 'rejected' THEN 'Rejected'
        ELSE 'Requested'
      END,
      lr.days_count || ' day(s) from ' || to_char(lr.start_date, 'DD Mon YYYY'),
      COALESCE(lr.reviewed_by, te.user_id),
      COALESCE(lr.reviewed_at, lr.created_at),
      jsonb_build_object(
        'leave_id', lr.id,
        'leave_type', lr.leave_type,
        'days', lr.days_count,
        'start_date', lr.start_date,
        'end_date', lr.end_date,
        'status', lr.status
      ),
      'manager'
    FROM leave_requests lr
    JOIN target_employee te ON te.id = lr.employee_id
    
    UNION ALL
    
    -- Learning & Development
    SELECT 
      ld.id,
      CASE ld.status
        WHEN 'completed' THEN 'training_completed'
        ELSE 'training_assigned'
      END,
      'learning',
      CASE ld.status
        WHEN 'completed' THEN 'Completed Training'
        ELSE 'Started Training'
      END,
      ld.title || ' (' || ld.type || ')',
      te.user_id,
      COALESCE(ld.completion_date, ld.created_at)::TIMESTAMPTZ,
      jsonb_build_object('learning_id', ld.id, 'type', ld.type, 'status', ld.status),
      'manager'
    FROM learning_development ld
    JOIN target_employee te ON te.id = ld.employee_id
    
    UNION ALL
    
    -- User activity logs (attendance, wiki, chat, documents)
    SELECT 
      ual.id,
      ual.activity_type,
      CASE 
        WHEN ual.activity_type LIKE 'attendance%' THEN 'attendance'
        WHEN ual.activity_type LIKE 'leave%' THEN 'leave'
        WHEN ual.activity_type LIKE 'document%' THEN 'documents'
        WHEN ual.activity_type LIKE 'wiki%' THEN 'documents'
        ELSE 'profile'
      END,
      CASE ual.activity_type
        WHEN 'attendance_checked_in' THEN 'Checked In'
        WHEN 'attendance_checked_out' THEN 'Checked Out'
        WHEN 'document_uploaded' THEN 'Document Uploaded'
        WHEN 'document_deleted' THEN 'Document Deleted'
        ELSE REPLACE(ual.activity_type, '_', ' ')
      END,
      NULL,
      ual.user_id,
      ual.created_at,
      ual.metadata,
      CASE 
        WHEN ual.activity_type LIKE 'document%' THEN 'self'
        ELSE 'manager'
      END
    FROM user_activity_logs ual
    JOIN target_employee te ON te.user_id = ual.user_id
    WHERE ual.organization_id = te.organization_id
  )
  SELECT 
    ae.event_id,
    ae.event_type,
    ae.event_category,
    ae.title,
    ae.description,
    ae.actor_id,
    p.full_name as actor_name,
    p.avatar_url as actor_avatar,
    ae.event_timestamp,
    ae.metadata,
    ae.access_level
  FROM all_events ae
  LEFT JOIN profiles p ON p.id = ae.actor_id
  WHERE 
    -- Apply event type filter
    (p_event_types IS NULL OR ae.event_type = ANY(p_event_types))
    -- Apply date filters
    AND (p_start_date IS NULL OR ae.event_timestamp::date >= p_start_date)
    AND (p_end_date IS NULL OR ae.event_timestamp::date <= p_end_date)
    -- Apply access level filter based on viewer permissions
    AND (
      is_admin_hr 
      OR is_own_profile
      OR (is_direct_manager AND ae.access_level IN ('public', 'manager'))
      OR ae.access_level = 'public'
    )
  ORDER BY ae.event_timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_employee_activity_timeline TO authenticated;

-- Add index on user_activity_logs for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created 
ON user_activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_org_created 
ON user_activity_logs(organization_id, created_at DESC);