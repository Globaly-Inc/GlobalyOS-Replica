-- Update validate_qr_and_record_attendance to allow multiple check-ins/check-outs per day (up to 6)
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
  _today_records_count INTEGER;
  _max_records_per_day INTEGER := 6;
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
  
  -- Count today's records
  SELECT COUNT(*) INTO _today_records_count
  FROM attendance_records
  WHERE employee_id = _employee_id AND date = _today;
  
  -- Get the latest record for today that doesn't have a check_out_time (active session)
  SELECT * INTO _existing_record
  FROM attendance_records
  WHERE employee_id = _employee_id 
    AND date = _today 
    AND check_out_time IS NULL
  ORDER BY check_in_time DESC
  LIMIT 1;
  
  IF _action = 'check_in' THEN
    -- Check if there's an active session (checked in but not out)
    IF _existing_record.id IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'You have an active session. Please check out first.');
    END IF;
    
    -- Check if reached daily limit
    IF _today_records_count >= _max_records_per_day THEN
      RETURN jsonb_build_object('success', false, 'error', 'Daily limit of ' || _max_records_per_day || ' check-ins reached');
    END IF;
    
    -- Determine if late based on schedule (only for first check-in of the day)
    _check_in_time := _now::time;
    IF _schedule.id IS NOT NULL AND _today_records_count = 0 THEN
      IF _check_in_time > (_schedule.work_start_time + (_schedule.late_threshold_minutes || ' minutes')::interval) THEN
        _status := 'late';
      END IF;
    END IF;
    
    -- Insert new attendance record
    INSERT INTO attendance_records (employee_id, organization_id, date, check_in_time, status)
    VALUES (_employee_id, _employee_org_id, _today, _now, _status);
    
    RETURN jsonb_build_object('success', true, 'message', 'Checked in successfully', 'status', _status, 'session', _today_records_count + 1);
    
  ELSIF _action = 'check_out' THEN
    IF _existing_record.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No active session. Please check in first.');
    END IF;
    
    -- Update check_out_time - work_hours is a generated column and auto-calculates
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

-- Drop the unique constraint on employee_id and date to allow multiple records per day
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_employee_id_date_key;