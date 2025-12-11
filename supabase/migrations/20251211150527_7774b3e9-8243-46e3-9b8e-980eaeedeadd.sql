-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  actor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- System can insert notifications (via triggers using security definer)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification for kudos
CREATE OR REPLACE FUNCTION public.notify_kudos_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_user_id UUID;
  giver_name TEXT;
BEGIN
  -- Get the recipient's user_id
  SELECT e.user_id INTO recipient_user_id
  FROM employees e
  WHERE e.id = NEW.employee_id;

  -- Get the giver's name
  SELECT p.full_name INTO giver_name
  FROM employees e
  JOIN profiles p ON p.id = e.user_id
  WHERE e.id = NEW.given_by_id;

  -- Create notification
  INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
  VALUES (
    recipient_user_id,
    NEW.organization_id,
    'kudos',
    'You received kudos!',
    giver_name || ' gave you kudos',
    'kudos',
    NEW.id,
    NEW.given_by_id
  );

  RETURN NEW;
END;
$$;

-- Trigger for kudos notifications
CREATE TRIGGER on_kudos_created_notify
AFTER INSERT ON public.kudos
FOR EACH ROW
EXECUTE FUNCTION public.notify_kudos_recipient();

-- Function to create notification for mentions
CREATE OR REPLACE FUNCTION public.notify_mention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_user_id UUID;
  poster_name TEXT;
  update_type TEXT;
BEGIN
  -- Get the mentioned employee's user_id
  SELECT e.user_id INTO mentioned_user_id
  FROM employees e
  WHERE e.id = NEW.employee_id;

  -- Get the poster's name and update type
  SELECT p.full_name, u.type INTO poster_name, update_type
  FROM updates u
  JOIN employees e ON e.id = u.employee_id
  JOIN profiles p ON p.id = e.user_id
  WHERE u.id = NEW.update_id;

  -- Create notification
  INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
  VALUES (
    mentioned_user_id,
    NEW.organization_id,
    'mention',
    'You were mentioned in a post',
    poster_name || ' mentioned you in a ' || COALESCE(update_type, 'post'),
    'update',
    NEW.update_id,
    (SELECT employee_id FROM updates WHERE id = NEW.update_id)
  );

  RETURN NEW;
END;
$$;

-- Trigger for mention notifications
CREATE TRIGGER on_mention_created_notify
AFTER INSERT ON public.update_mentions
FOR EACH ROW
EXECUTE FUNCTION public.notify_mention();

-- Function to notify manager of leave request
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

-- Trigger for leave request notifications
CREATE TRIGGER on_leave_request_created_notify
AFTER INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_leave_request();