-- Add skip_notification column to leave_requests
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS skip_notification BOOLEAN DEFAULT false;

-- Update the notify_leave_request function to check skip_notification flag
CREATE OR REPLACE FUNCTION public.notify_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manager_user_id UUID;
  employee_name TEXT;
  manager_employee_id UUID;
BEGIN
  -- Skip notification if flag is set (e.g., during bulk import)
  IF NEW.skip_notification = true THEN
    RETURN NEW;
  END IF;

  -- Get the employee's name and manager's user_id
  SELECT p.full_name, m.user_id, e.manager_id INTO employee_name, manager_user_id, manager_employee_id
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
      'leave_request',
      'New leave request',
      employee_name || ' requested ' || NEW.leave_type || ' leave',
      'leave_request',
      NEW.id,
      NEW.employee_id
    );
  END IF;

  -- Also notify HR and Admin users
  INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
  SELECT 
    ur.user_id,
    NEW.organization_id,
    'leave_request',
    'New leave request',
    employee_name || ' requested ' || NEW.leave_type || ' leave',
    'leave_request',
    NEW.id,
    NEW.employee_id
  FROM user_roles ur
  WHERE ur.role IN ('hr', 'admin')
    AND ur.organization_id = NEW.organization_id
    AND ur.user_id != (SELECT user_id FROM employees WHERE id = NEW.employee_id);

  RETURN NEW;
END;
$$;