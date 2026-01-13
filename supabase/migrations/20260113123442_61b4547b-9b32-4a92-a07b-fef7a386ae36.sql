-- Create user_error_logs table for centralized error tracking
CREATE TABLE public.user_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Error details
  error_type TEXT NOT NULL, -- 'runtime', 'network', 'edge_function', 'database', 'auth', 'validation'
  severity TEXT NOT NULL DEFAULT 'error', -- 'warning', 'error', 'critical'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Context
  page_url TEXT NOT NULL,
  component_name TEXT,
  action_attempted TEXT,
  
  -- Environment
  browser_info TEXT,
  device_type TEXT,
  user_agent TEXT,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'investigating', 'resolved', 'ignored'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create error_notification_throttle table to prevent notification spam
CREATE TABLE public.error_notification_throttle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notification_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_user_error_logs_created_at ON public.user_error_logs(created_at DESC);
CREATE INDEX idx_user_error_logs_user_id ON public.user_error_logs(user_id);
CREATE INDEX idx_user_error_logs_org_id ON public.user_error_logs(organization_id);
CREATE INDEX idx_user_error_logs_status ON public.user_error_logs(status);
CREATE INDEX idx_user_error_logs_error_type ON public.user_error_logs(error_type);
CREATE INDEX idx_user_error_logs_severity ON public.user_error_logs(severity);
CREATE INDEX idx_error_throttle_lookup ON public.error_notification_throttle(error_type, organization_id, last_notified_at);

-- Enable RLS
ALTER TABLE public.user_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_notification_throttle ENABLE ROW LEVEL SECURITY;

-- Super admin can view all error logs
CREATE POLICY "Super admins can view all error logs"
ON public.user_error_logs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'super_admin'
));

-- Super admin can update error logs (status, resolution)
CREATE POLICY "Super admins can update error logs"
ON public.user_error_logs FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'super_admin'
));

-- Authenticated users can insert error logs
CREATE POLICY "Authenticated users can create error logs"
ON public.user_error_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Throttle table policies
CREATE POLICY "Super admins can view throttle"
ON public.error_notification_throttle FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'super_admin'
));

CREATE POLICY "Super admins can manage throttle"
ON public.error_notification_throttle FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'super_admin'
));

-- Enable pg_net extension for HTTP calls from triggers (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create notification trigger function
CREATE OR REPLACE FUNCTION public.notify_critical_error()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger for critical or error severity
  IF NEW.severity IN ('critical', 'error') THEN
    PERFORM extensions.http_post(
      'https://rygowmzkvxgnxagqlyxf.supabase.co/functions/v1/notify-critical-error'::text,
      jsonb_build_object(
        'error_log_id', NEW.id,
        'severity', NEW.severity,
        'error_message', NEW.error_message,
        'error_type', NEW.error_type,
        'user_id', NEW.user_id,
        'organization_id', NEW.organization_id,
        'page_url', NEW.page_url,
        'error_stack', NEW.error_stack
      )::text,
      'application/json'::text
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_critical_error_insert
AFTER INSERT ON public.user_error_logs
FOR EACH ROW
EXECUTE FUNCTION public.notify_critical_error();