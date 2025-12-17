-- Update record_remote_attendance to accept and save location_name
CREATE OR REPLACE FUNCTION public.record_remote_attendance(
  _action TEXT,
  _user_latitude NUMERIC,
  _user_longitude NUMERIC,
  _location_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employee_id UUID;
  v_organization_id UUID;
  v_today DATE := CURRENT_DATE;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_active_session RECORD;
  v_total_sessions INTEGER;
BEGIN
  -- Get employee ID for current user
  SELECT id, organization_id INTO v_employee_id, v_organization_id
  FROM employees
  WHERE user_id = auth.uid();
  
  IF v_employee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Count total sessions today (max 3 sessions)
  SELECT COUNT(*) INTO v_total_sessions
  FROM attendance_records
  WHERE employee_id = v_employee_id AND date = v_today;
  
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
    
    -- Check if already reached max sessions (3 check-ins)
    IF v_total_sessions >= 3 THEN
      RETURN json_build_object('success', false, 'error', 'Maximum check-ins (3) reached for today');
    END IF;
    
    -- Create new check-in record with location data
    INSERT INTO attendance_records (
      employee_id, 
      organization_id, 
      date, 
      check_in_time, 
      status,
      check_in_latitude,
      check_in_longitude,
      check_in_location_name,
      notes
    )
    VALUES (
      v_employee_id, 
      v_organization_id, 
      v_today, 
      v_now, 
      'remote',
      _user_latitude,
      _user_longitude,
      _location_name,
      'Remote check-in'
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
    
    -- Update the record with check-out time
    UPDATE attendance_records
    SET check_out_time = v_now,
        updated_at = v_now
    WHERE id = v_active_session.id;
    
    RETURN json_build_object('success', true, 'action', 'check_out', 'time', v_now);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$;