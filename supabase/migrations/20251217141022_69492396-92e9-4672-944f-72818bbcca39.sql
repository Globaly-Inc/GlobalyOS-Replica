-- Update validate_qr_and_record_attendance to save check_in_office_id and location data
CREATE OR REPLACE FUNCTION public.validate_qr_and_record_attendance(_action text, _qr_code text, _user_latitude numeric DEFAULT NULL::numeric, _user_longitude numeric DEFAULT NULL::numeric)
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
  v_qr_latitude numeric;
  v_qr_longitude numeric;
  v_qr_radius integer;
  v_distance numeric;
  v_office_name text;
BEGIN
  -- Get employee ID for current user
  SELECT id, organization_id INTO v_employee_id, v_organization_id
  FROM employees
  WHERE user_id = auth.uid();
  
  IF v_employee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
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
    
    -- Update the record with check-out time only (work_hours is auto-calculated)
    UPDATE attendance_records
    SET check_out_time = v_now,
        updated_at = v_now
    WHERE id = v_active_session.id;
    
    RETURN json_build_object('success', true, 'action', 'check_out', 'time', v_now);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$function$;