-- Add work_location column to employee_schedules
ALTER TABLE public.employee_schedules 
ADD COLUMN IF NOT EXISTS work_location TEXT NOT NULL DEFAULT 'office';

-- Add check constraint for valid work_location values
ALTER TABLE public.employee_schedules
ADD CONSTRAINT employee_schedules_work_location_check 
CHECK (work_location IN ('office', 'hybrid', 'remote'));

-- Create wfh_requests table
CREATE TABLE public.wfh_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.employees(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wfh_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wfh_requests
-- Users can view their own WFH requests
CREATE POLICY "Users can view own wfh requests"
ON public.wfh_requests
FOR SELECT
USING (is_own_employee(employee_id));

-- Managers can view direct reports WFH requests
CREATE POLICY "Managers can view direct reports wfh requests"
ON public.wfh_requests
FOR SELECT
USING (is_manager_of_employee(employee_id));

-- HR and admins can view all WFH requests in their org
CREATE POLICY "HR and admins can view all wfh requests"
ON public.wfh_requests
FOR SELECT
USING ((has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')) 
       AND is_org_member(auth.uid(), organization_id));

-- Users can create their own WFH requests
CREATE POLICY "Users can create own wfh requests"
ON public.wfh_requests
FOR INSERT
WITH CHECK (is_own_employee(employee_id) AND is_org_member(auth.uid(), organization_id));

-- Users can update their own pending WFH requests (cancel)
CREATE POLICY "Users can update own pending wfh requests"
ON public.wfh_requests
FOR UPDATE
USING (is_own_employee(employee_id) AND status = 'pending');

-- Managers can update direct reports WFH requests (approve/reject)
CREATE POLICY "Managers can update direct reports wfh requests"
ON public.wfh_requests
FOR UPDATE
USING (is_manager_of_employee(employee_id));

-- HR, admin, owner can update all WFH requests
CREATE POLICY "HR admin owner can update all wfh requests"
ON public.wfh_requests
FOR UPDATE
USING ((has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
       AND is_org_member(auth.uid(), organization_id));

-- Users can delete their own pending WFH requests
CREATE POLICY "Users can delete own pending wfh requests"
ON public.wfh_requests
FOR DELETE
USING (is_own_employee(employee_id) AND status = 'pending');

-- Create updated_at trigger
CREATE TRIGGER update_wfh_requests_updated_at
BEFORE UPDATE ON public.wfh_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification trigger for WFH requests
CREATE OR REPLACE FUNCTION public.notify_wfh_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  manager_user_id UUID;
  employee_name TEXT;
BEGIN
  -- Get the employee's name and manager's user_id
  SELECT p.full_name, m.user_id INTO employee_name, manager_user_id
  FROM employees e
  JOIN profiles p ON p.id = e.user_id
  LEFT JOIN employees m ON m.id = e.manager_id
  WHERE e.id = NEW.employee_id;

  -- Notify manager if exists
  IF manager_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
    VALUES (
      manager_user_id,
      NEW.organization_id,
      'wfh_request',
      'New WFH request',
      employee_name || ' requested to work from home',
      'wfh_request',
      NEW.id,
      NEW.employee_id
    );
  END IF;

  -- Also notify HR and Admin users
  INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
  SELECT 
    ur.user_id,
    NEW.organization_id,
    'wfh_request',
    'New WFH request',
    employee_name || ' requested to work from home',
    'wfh_request',
    NEW.id,
    NEW.employee_id
  FROM user_roles ur
  WHERE ur.role IN ('hr', 'admin')
    AND ur.organization_id = NEW.organization_id
    AND ur.user_id != (SELECT user_id FROM employees WHERE id = NEW.employee_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_wfh_request_trigger
AFTER INSERT ON public.wfh_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_wfh_request();

-- Add remote status to attendance_records
ALTER TABLE public.attendance_records
DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE public.attendance_records
ADD CONSTRAINT attendance_records_status_check 
CHECK (status IN ('present', 'absent', 'late', 'half_day', 'remote'));

-- Create function for remote attendance (no QR required)
CREATE OR REPLACE FUNCTION public.record_remote_attendance(
  _action TEXT,
  _user_latitude NUMERIC,
  _user_longitude NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employee_id uuid;
  v_organization_id uuid;
  v_work_location text;
  v_today date := CURRENT_DATE;
  v_now timestamp with time zone := now();
  v_active_session record;
  v_total_sessions integer;
BEGIN
  -- Get employee ID and work location for current user
  SELECT e.id, e.organization_id, COALESCE(es.work_location, 'office')
  INTO v_employee_id, v_organization_id, v_work_location
  FROM employees e
  LEFT JOIN employee_schedules es ON es.employee_id = e.id
  WHERE e.user_id = auth.uid();
  
  IF v_employee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Employee not found');
  END IF;
  
  -- Only allow remote check-in for hybrid/remote employees
  IF v_work_location = 'office' THEN
    RETURN json_build_object('success', false, 'error', 'Office employees must use QR code to check in');
  END IF;
  
  -- Require location
  IF _user_latitude IS NULL OR _user_longitude IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Location is required for remote check-in');
  END IF;
  
  -- Count total sessions today (max 3 sessions)
  SELECT COUNT(*) INTO v_total_sessions
  FROM attendance_records
  WHERE employee_id = v_employee_id AND date = v_today;
  
  IF _action = 'check_in' THEN
    -- Check if there's an active session
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
    
    IF v_total_sessions >= 3 THEN
      RETURN json_build_object('success', false, 'error', 'Maximum check-ins (3) reached for today');
    END IF;
    
    -- Create new check-in record with remote status
    INSERT INTO attendance_records (employee_id, organization_id, date, check_in_time, status, notes)
    VALUES (v_employee_id, v_organization_id, v_today, v_now, 'remote', 
            'Remote check-in from: ' || _user_latitude || ', ' || _user_longitude);
    
    RETURN json_build_object('success', true, 'action', 'check_in', 'time', v_now, 'location', 'remote');
    
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

-- Enable realtime for wfh_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.wfh_requests;