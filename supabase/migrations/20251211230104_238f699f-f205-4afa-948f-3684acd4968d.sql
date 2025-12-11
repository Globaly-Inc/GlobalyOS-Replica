-- Update the function to NOT update work_hours (it's a generated column)
DROP FUNCTION IF EXISTS public.validate_qr_and_record_attendance(text, text);

CREATE FUNCTION public.validate_qr_and_record_attendance(_action text, _qr_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_office_id uuid;
  v_organization_id uuid;
  v_qr_org_id uuid;
  v_today date := CURRENT_DATE;
  v_now timestamp with time zone := now();
  v_active_session record;
  v_total_sessions integer;
BEGIN
  -- Get employee ID for current user
  SELECT id, organization_id INTO v_employee_id, v_organization_id
  FROM employees
  WHERE user_id = auth.uid();
  
  IF v_employee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Validate QR code
  SELECT office_id, organization_id INTO v_office_id, v_qr_org_id
  FROM office_qr_codes
  WHERE code = _qr_code AND is_active = true;
  
  IF v_office_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired QR code');
  END IF;
  
  -- Verify QR code belongs to same organization
  IF v_qr_org_id != v_organization_id THEN
    RETURN json_build_object('success', false, 'error', 'QR code does not belong to your organization');
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
    
    -- Create new check-in record
    INSERT INTO attendance_records (employee_id, organization_id, date, check_in_time, status)
    VALUES (v_employee_id, v_organization_id, v_today, v_now, 'present');
    
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
$$;