-- Create table for office QR codes (one active code per office)
CREATE TABLE public.office_qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.employees(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT unique_active_code_per_office UNIQUE (office_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create table for employee work schedules
CREATE TABLE public.employee_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_start_time TIME NOT NULL DEFAULT '09:00:00',
  work_end_time TIME NOT NULL DEFAULT '17:00:00',
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_schedule_per_employee UNIQUE (employee_id)
);

-- Enable RLS
ALTER TABLE public.office_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for office_qr_codes
CREATE POLICY "HR and admins can manage QR codes"
ON public.office_qr_codes
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view active QR codes"
ON public.office_qr_codes
FOR SELECT
USING (is_org_member(auth.uid(), organization_id) AND is_active = true);

-- RLS policies for employee_schedules
CREATE POLICY "HR and admins can manage schedules"
ON public.employee_schedules
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own schedule"
ON public.employee_schedules
FOR SELECT
USING (is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports schedules"
ON public.employee_schedules
FOR SELECT
USING (is_manager_of_employee(employee_id));

-- Add trigger for updated_at on employee_schedules
CREATE TRIGGER update_employee_schedules_updated_at
BEFORE UPDATE ON public.employee_schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create function to validate QR code and record attendance
CREATE OR REPLACE FUNCTION public.validate_qr_and_record_attendance(
  _qr_code TEXT,
  _action TEXT -- 'check_in' or 'check_out'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee_id UUID;
  _employee_office_id UUID;
  _qr_office_id UUID;
  _org_id UUID;
  _today DATE := CURRENT_DATE;
  _now TIMESTAMP WITH TIME ZONE := now();
  _existing_record attendance_records%ROWTYPE;
  _schedule employee_schedules%ROWTYPE;
  _status TEXT := 'present';
  _check_in_time TIME;
BEGIN
  -- Get current employee
  SELECT id, office_id, organization_id INTO _employee_id, _employee_office_id, _org_id
  FROM employees WHERE user_id = auth.uid();
  
  IF _employee_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Validate QR code
  SELECT office_id INTO _qr_office_id
  FROM office_qr_codes
  WHERE code = _qr_code AND is_active = true;
  
  IF _qr_office_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired QR code');
  END IF;
  
  -- Check if QR code matches employee's office
  IF _qr_office_id != _employee_office_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR code does not match your assigned office');
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
    VALUES (_employee_id, _org_id, _today, _now, _status)
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
    
    -- Calculate work hours
    UPDATE attendance_records
    SET check_out_time = _now,
        work_hours = EXTRACT(EPOCH FROM (_now - check_in_time)) / 3600,
        updated_at = now()
    WHERE id = _existing_record.id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Checked out successfully');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$;

-- Add unique constraint on attendance_records for employee_id and date if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_records_employee_date_unique'
  ) THEN
    ALTER TABLE public.attendance_records 
    ADD CONSTRAINT attendance_records_employee_date_unique UNIQUE (employee_id, date);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;