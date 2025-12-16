-- Add check_in_office_id column to attendance_records
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS check_in_office_id uuid REFERENCES offices(id) ON DELETE SET NULL;

-- Update the validate_qr_and_record_attendance function to store office_id
CREATE OR REPLACE FUNCTION validate_qr_and_record_attendance(
  p_qr_code text,
  p_action text,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record office_qr_codes%ROWTYPE;
  v_employee_id uuid;
  v_organization_id uuid;
  v_today date := CURRENT_DATE;
  v_now timestamp with time zone := now();
  v_existing_record attendance_records%ROWTYPE;
  v_distance double precision;
  v_office_id uuid;
BEGIN
  -- Get current employee
  SELECT id, organization_id INTO v_employee_id, v_organization_id
  FROM employees
  WHERE user_id = auth.uid();
  
  IF v_employee_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Validate QR code
  SELECT * INTO v_qr_record
  FROM office_qr_codes
  WHERE code = p_qr_code
    AND organization_id = v_organization_id
    AND is_active = true;
  
  IF v_qr_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive QR code');
  END IF;
  
  v_office_id := v_qr_record.office_id;
  
  -- Check location if QR has location requirements
  IF v_qr_record.latitude IS NOT NULL AND v_qr_record.longitude IS NOT NULL 
     AND v_qr_record.radius_meters IS NOT NULL THEN
    IF p_latitude IS NULL OR p_longitude IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Location required for this QR code');
    END IF;
    
    -- Calculate distance using Haversine formula
    v_distance := 6371000 * acos(
      cos(radians(v_qr_record.latitude)) * cos(radians(p_latitude)) *
      cos(radians(p_longitude) - radians(v_qr_record.longitude)) +
      sin(radians(v_qr_record.latitude)) * sin(radians(p_latitude))
    );
    
    IF v_distance > v_qr_record.radius_meters THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'You are too far from the office location',
        'distance', round(v_distance::numeric, 0),
        'allowed_radius', v_qr_record.radius_meters
      );
    END IF;
  END IF;
  
  -- Get existing record for today
  SELECT * INTO v_existing_record
  FROM attendance_records
  WHERE employee_id = v_employee_id
    AND date = v_today;
  
  IF p_action = 'check_in' THEN
    IF v_existing_record IS NOT NULL AND v_existing_record.check_in_time IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already checked in today');
    END IF;
    
    IF v_existing_record IS NULL THEN
      INSERT INTO attendance_records (employee_id, organization_id, date, check_in_time, status, check_in_office_id)
      VALUES (v_employee_id, v_organization_id, v_today, v_now, 'present', v_office_id);
    ELSE
      UPDATE attendance_records
      SET check_in_time = v_now, status = 'present', check_in_office_id = v_office_id, updated_at = v_now
      WHERE id = v_existing_record.id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Checked in successfully', 'time', v_now);
    
  ELSIF p_action = 'check_out' THEN
    IF v_existing_record IS NULL OR v_existing_record.check_in_time IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Must check in before checking out');
    END IF;
    
    IF v_existing_record.check_out_time IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already checked out today');
    END IF;
    
    UPDATE attendance_records
    SET check_out_time = v_now,
        work_hours = EXTRACT(EPOCH FROM (v_now - check_in_time)) / 3600,
        updated_at = v_now
    WHERE id = v_existing_record.id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Checked out successfully', 'time', v_now);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$;