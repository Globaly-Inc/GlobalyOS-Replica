-- Add timezone column to organizations if not exists
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kathmandu';

-- Update record_remote_attendance function to use organization timezone
CREATE OR REPLACE FUNCTION public.record_remote_attendance(
  _action text,
  _user_latitude numeric,
  _user_longitude numeric,
  _location_name text DEFAULT NULL,
  _early_checkout_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_employee_id UUID;
  v_organization_id UUID;
  v_org_timezone TEXT;
  v_today DATE;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_active_session RECORD;
  v_total_sessions INTEGER;
  v_completed_sessions INTEGER;
  v_multi_session_enabled BOOLEAN;
  v_max_sessions INTEGER;
BEGIN
  -- Get employee ID for current user
  SELECT id, organization_id INTO v_employee_id, v_organization_id
  FROM employees
  WHERE user_id = auth.uid();
  
  IF v_employee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Get organization settings including timezone
  SELECT 
    COALESCE(multi_session_enabled, true),
    COALESCE(max_sessions_per_day, 3),
    COALESCE(timezone, 'Asia/Kathmandu')
  INTO v_multi_session_enabled, v_max_sessions, v_org_timezone
  FROM organizations
  WHERE id = v_organization_id;
  
  -- Calculate "today" in the organization's timezone
  v_today := (v_now AT TIME ZONE v_org_timezone)::DATE;
  
  -- Count total sessions today
  SELECT COUNT(*) INTO v_total_sessions
  FROM attendance_records
  WHERE employee_id = v_employee_id AND date = v_today;
  
  -- Count completed sessions (checked in AND checked out)
  SELECT COUNT(*) INTO v_completed_sessions
  FROM attendance_records
  WHERE employee_id = v_employee_id 
    AND date = v_today 
    AND check_out_time IS NOT NULL;
  
  IF _action = 'check_in' THEN
    -- Check if there's an active session (checked in but not checked out)
    SELECT * INTO v_active_session
    FROM attendance_records
    WHERE employee_id = v_employee_id 
      AND date = v_today 
      AND check_out_time IS NULL
    ORDER BY check_in_time DESC
    LIMIT 1;
    
    IF v_active_session.id IS NOT NULL THEN
      RETURN json_build_object('success', false, 'error', 'You already have an active check-in. Please check out first.');
    END IF;
    
    -- Check multi-session settings
    IF NOT v_multi_session_enabled THEN
      -- Multi-session disabled: check if user already has a completed session
      IF v_completed_sessions > 0 THEN
        RETURN json_build_object('success', false, 'error', 'Multiple sessions are not allowed. You have already completed your attendance for today.');
      END IF;
    ELSE
      -- Multi-session enabled: check against max sessions
      IF v_total_sessions >= v_max_sessions THEN
        RETURN json_build_object('success', false, 'error', 'Maximum check-ins (' || v_max_sessions || ') reached for today');
      END IF;
    END IF;
    
    -- Create new check-in record with location data
    INSERT INTO attendance_records (
      employee_id, organization_id, date, check_in_time, status,
      check_in_latitude, check_in_longitude, check_in_location_name
    )
    VALUES (
      v_employee_id, v_organization_id, v_today, v_now, 'present',
      _user_latitude, _user_longitude, _location_name
    );
    
    RETURN json_build_object('success', true, 'action', 'check_in', 'time', v_now);
    
  ELSIF _action = 'check_out' THEN
    -- Find active session to check out
    SELECT * INTO v_active_session
    FROM attendance_records
    WHERE employee_id = v_employee_id 
      AND date = v_today 
      AND check_out_time IS NULL
    ORDER BY check_in_time DESC
    LIMIT 1;
    
    IF v_active_session.id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'No active check-in found. Please check in first.');
    END IF;
    
    -- Update the record with check-out time and optional early checkout reason
    UPDATE attendance_records
    SET check_out_time = v_now,
        updated_at = v_now,
        early_checkout_reason = _early_checkout_reason
    WHERE id = v_active_session.id;
    
    RETURN json_build_object('success', true, 'action', 'check_out', 'time', v_now);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$function$;