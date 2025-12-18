-- Drop the 4-parameter version (without _early_checkout_reason)
DROP FUNCTION IF EXISTS public.validate_qr_and_record_attendance(text, text, numeric, numeric);

-- Drop any legacy version with different parameter order
DROP FUNCTION IF EXISTS public.validate_qr_and_record_attendance(text, numeric, numeric, text);

-- Recreate the single 5-parameter version with proper defaults
CREATE OR REPLACE FUNCTION public.validate_qr_and_record_attendance(
  _action text, 
  _qr_code text, 
  _user_latitude numeric DEFAULT NULL::numeric, 
  _user_longitude numeric DEFAULT NULL::numeric, 
  _early_checkout_reason text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_employee_id uuid;
  v_office_id uuid;
  v_organization_id uuid;
  v_qr_org_id uuid;
  v_today date := CURRENT_DATE;
  v_now timestamp with time zone := now();
  v_active_session record;
  v_total_sessions integer;
  v_completed_sessions integer;
  v_qr_latitude numeric;
  v_qr_longitude numeric;
  v_qr_radius integer;
  v_distance numeric;
  v_office_name text;
  v_multi_session_enabled boolean;
  v_max_sessions integer;
BEGIN
  -- Get employee ID for current user
  SELECT id, organization_id INTO v_employee_id, v_organization_id
  FROM employees
  WHERE user_id = auth.uid();
  
  IF v_employee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Get organization settings for multi-session
  SELECT 
    COALESCE(multi_session_enabled, true),
    COALESCE(max_sessions_per_day, 3)
  INTO v_multi_session_enabled, v_max_sessions
  FROM organizations
  WHERE id = v_organization_id;
  
  -- Validate QR code and get location settings
  SELECT oqc.office_id, oqc.organization_id, oqc.latitude, oqc.longitude, oqc.radius_meters, o.name
  INTO v_office_id, v_qr_org_id, v_qr_latitude, v_qr_longitude, v_qr_radius, v_office_name
  FROM office_qr_codes oqc
  LEFT JOIN offices o ON o.id = oqc.office_id
  WHERE oqc.code = _qr_code AND oqc.is_active = true;
  
  IF v_office_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired QR code');
  END IF;
  
  -- Verify QR code belongs to same organization
  IF v_qr_org_id != v_organization_id THEN
    RETURN json_build_object('success', false, 'error', 'QR code does not belong to your organization');
  END IF;
  
  -- Location validation - only if QR has location configured
  IF v_qr_latitude IS NOT NULL AND v_qr_longitude IS NOT NULL AND v_qr_radius IS NOT NULL THEN
    -- User must provide location
    IF _user_latitude IS NULL OR _user_longitude IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Location is required for check-in. Please allow location access.');
    END IF;
    
    -- Calculate distance using Haversine formula (result in meters)
    v_distance := 6371000 * 2 * ASIN(
      SQRT(
        POWER(SIN(RADIANS(v_qr_latitude - _user_latitude) / 2), 2) +
        COS(RADIANS(_user_latitude)) * COS(RADIANS(v_qr_latitude)) *
        POWER(SIN(RADIANS(v_qr_longitude - _user_longitude) / 2), 2)
      )
    );
    
    -- Check if user is within radius
    IF v_distance > v_qr_radius THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'You are too far from the office location. Please move closer to check in.',
        'distance', ROUND(v_distance),
        'required_radius', v_qr_radius
      );
    END IF;
  END IF;
  
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
    
    -- Create new check-in record with office ID and location data
    INSERT INTO attendance_records (
      employee_id, organization_id, date, check_in_time, status,
      check_in_office_id, check_in_latitude, check_in_longitude, check_in_location_name
    )
    VALUES (
      v_employee_id, v_organization_id, v_today, v_now, 'present',
      v_office_id, _user_latitude, _user_longitude, v_office_name
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