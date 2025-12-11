-- Fix the validate_qr_and_record_attendance function to not update generated column work_hours
CREATE OR REPLACE FUNCTION public.validate_qr_and_record_attendance(_qr_code text, _action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _employee_id UUID;
  _employee_org_id UUID;
  _qr_office_id UUID;
  _qr_org_id UUID;
  _today DATE := CURRENT_DATE;
  _now TIMESTAMP WITH TIME ZONE := now();
  _existing_record attendance_records%ROWTYPE;
  _schedule employee_schedules%ROWTYPE;
  _status TEXT := 'present';
  _check_in_time TIME;
BEGIN
  -- Get current employee
  SELECT id, organization_id INTO _employee_id, _employee_org_id
  FROM employees WHERE user_id = auth.uid();
  
  IF _employee_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Validate QR code and get its organization
  SELECT qr.office_id, qr.organization_id INTO _qr_office_id, _qr_org_id
  FROM office_qr_codes qr
  WHERE qr.code = _qr_code AND qr.is_active = true;
  
  IF _qr_office_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired QR code');
  END IF;
  
  -- Check if QR code belongs to the same organization as the employee
  IF _qr_org_id != _employee_org_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR code does not belong to your organization');
  END IF;
  
  -- Get employee's schedule
  SELECT * INTO _schedule FROM employee_schedules WHERE employee_id = _employee_id;
  
  -- Check for existing record today
  SELECT * INTO _existing_record
  FROM attendance_records
  WHERE employee_id = _employee_id AND date = _today;
  
  IF _action = 'check_in' THEN
    IF _existing_record.id IS NOT NULL AND _existing_record.check_in_time IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already checked in today');
    END IF;
    
    -- Determine if late based on schedule
    _check_in_time := _now::time;
    IF _schedule.id IS NOT NULL THEN
      IF _check_in_time > (_schedule.work_start_time + (_schedule.late_threshold_minutes || ' minutes')::interval) THEN
        _status := 'late';
      END IF;
    END IF;
    
    -- Insert or update attendance record
    INSERT INTO attendance_records (employee_id, organization_id, date, check_in_time, status)
    VALUES (_employee_id, _employee_org_id, _today, _now, _status)
    ON CONFLICT (employee_id, date) 
    DO UPDATE SET check_in_time = _now, status = _status, updated_at = now();
    
    RETURN jsonb_build_object('success', true, 'message', 'Checked in successfully', 'status', _status);
    
  ELSIF _action = 'check_out' THEN
    IF _existing_record.id IS NULL OR _existing_record.check_in_time IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'You must check in first');
    END IF;
    
    IF _existing_record.check_out_time IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already checked out today');
    END IF;
    
    -- Update check_out_time only - work_hours is a generated column and auto-calculates
    UPDATE attendance_records
    SET check_out_time = _now,
        updated_at = now()
    WHERE id = _existing_record.id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Checked out successfully');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$;