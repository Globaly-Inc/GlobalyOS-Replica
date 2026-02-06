
-- Add check-out coordinate columns to attendance_records
ALTER TABLE public.attendance_records 
  ADD COLUMN IF NOT EXISTS check_out_latitude numeric,
  ADD COLUMN IF NOT EXISTS check_out_longitude numeric,
  ADD COLUMN IF NOT EXISTS check_out_location_name text;

-- Recreate record_remote_attendance with check-out coordinate support
DROP FUNCTION IF EXISTS public.record_remote_attendance(text, numeric, numeric, text, text);

CREATE OR REPLACE FUNCTION public.record_remote_attendance(
  _action text,
  _user_latitude numeric DEFAULT NULL::numeric,
  _user_longitude numeric DEFAULT NULL::numeric,
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
  v_employee_office_id UUID;
  v_org_timezone TEXT;
  v_today DATE;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_active_session RECORD;
  v_total_sessions INTEGER;
  v_completed_sessions INTEGER;
  v_multi_session_enabled BOOLEAN;
  v_max_sessions INTEGER;
  v_early_checkout_reason_required BOOLEAN;
BEGIN
  -- Get employee ID, organization, and office for current user
  SELECT e.id, e.organization_id, e.office_id
  INTO v_employee_id, v_organization_id, v_employee_office_id
  FROM employees e
  WHERE e.user_id = auth.uid();
  
  IF v_employee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Get settings: prefer office-level, fall back to org-level
  SELECT 
    COALESCE(oas.multi_session_enabled, o.multi_session_enabled, true),
    COALESCE(oas.max_sessions_per_day, o.max_sessions_per_day, 3),
    COALESCE(oas.early_checkout_reason_required, o.early_checkout_reason_required, true),
    COALESCE(o.timezone, 'UTC')
  INTO v_multi_session_enabled, v_max_sessions, v_early_checkout_reason_required, v_org_timezone
  FROM organizations o
  LEFT JOIN office_attendance_settings oas ON oas.office_id = v_employee_office_id
  WHERE o.id = v_organization_id;
  
  -- Calculate "today" in the organization's timezone
  v_today := (v_now AT TIME ZONE v_org_timezone)::DATE;
  
  -- Count total sessions today
  SELECT COUNT(*) INTO v_total_sessions
  FROM attendance_records
  WHERE employee_id = v_employee_id AND date = v_today;
  
  -- Count completed sessions
  SELECT COUNT(*) INTO v_completed_sessions
  FROM attendance_records
  WHERE employee_id = v_employee_id 
    AND date = v_today 
    AND check_out_time IS NOT NULL;
  
  IF _action = 'check_in' THEN
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
    
    IF NOT v_multi_session_enabled THEN
      IF v_completed_sessions > 0 THEN
        RETURN json_build_object('success', false, 'error', 'Multiple sessions are not allowed. You have already completed your attendance for today.');
      END IF;
    ELSE
      IF v_total_sessions >= v_max_sessions THEN
        RETURN json_build_object('success', false, 'error', 'Maximum check-ins (' || v_max_sessions || ') reached for today');
      END IF;
    END IF;
    
    -- Create new check-in record with optional location data
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
    
    -- Update with check-out time, location, and optional reason
    UPDATE attendance_records
    SET check_out_time = v_now,
        updated_at = v_now,
        check_out_latitude = _user_latitude,
        check_out_longitude = _user_longitude,
        check_out_location_name = _location_name,
        early_checkout_reason = _early_checkout_reason
    WHERE id = v_active_session.id;
    
    RETURN json_build_object('success', true, 'action', 'check_out', 'time', v_now);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$function$;
