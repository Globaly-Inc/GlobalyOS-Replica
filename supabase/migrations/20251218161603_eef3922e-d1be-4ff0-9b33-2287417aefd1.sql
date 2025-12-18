-- Table 1: Track page visits
CREATE TABLE public.user_page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  browser_info TEXT,
  device_type TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_user_page_visits_user_id ON public.user_page_visits(user_id);
CREATE INDEX idx_user_page_visits_visited_at ON public.user_page_visits(visited_at DESC);

-- RLS
ALTER TABLE public.user_page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all page visits"
ON public.user_page_visits FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "Users can insert own page visits"
ON public.user_page_visits FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Table 2: Track user activities
CREATE TABLE public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);

-- RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all activity logs"
ON public.user_activity_logs FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "System can insert activity logs"
ON public.user_activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger function for wiki_pages
CREATE OR REPLACE FUNCTION public.log_wiki_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity_logs (user_id, activity_type, entity_type, entity_id, organization_id)
  SELECT e.user_id, 'wiki_created', 'wiki_page', NEW.id, NEW.organization_id
  FROM public.employees e WHERE e.id = NEW.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_wiki_activity
AFTER INSERT ON public.wiki_pages
FOR EACH ROW EXECUTE FUNCTION public.log_wiki_activity();

-- Trigger function for chat_messages
CREATE OR REPLACE FUNCTION public.log_chat_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity_logs (user_id, activity_type, entity_type, entity_id, organization_id)
  SELECT e.user_id, 'chat_sent', 'chat_message', NEW.id, NEW.organization_id
  FROM public.employees e WHERE e.id = NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_chat_activity
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.log_chat_activity();

-- Trigger function for updates (posts)
CREATE OR REPLACE FUNCTION public.log_update_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity_logs (user_id, activity_type, entity_type, entity_id, organization_id)
  SELECT e.user_id, 'update_posted', 'update', NEW.id, NEW.organization_id
  FROM public.employees e WHERE e.id = NEW.employee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_update_activity
AFTER INSERT ON public.updates
FOR EACH ROW EXECUTE FUNCTION public.log_update_activity();

-- Trigger function for kudos
CREATE OR REPLACE FUNCTION public.log_kudos_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity_logs (user_id, activity_type, entity_type, entity_id, organization_id)
  SELECT e.user_id, 'kudos_given', 'kudos', NEW.id, NEW.organization_id
  FROM public.employees e WHERE e.id = NEW.given_by_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_kudos_activity
AFTER INSERT ON public.kudos
FOR EACH ROW EXECUTE FUNCTION public.log_kudos_activity();

-- Trigger function for leave_requests
CREATE OR REPLACE FUNCTION public.log_leave_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity_logs (user_id, activity_type, entity_type, entity_id, organization_id)
  SELECT e.user_id, 'leave_requested', 'leave_request', NEW.id, NEW.organization_id
  FROM public.employees e WHERE e.id = NEW.employee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_leave_activity
AFTER INSERT ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.log_leave_activity();

-- Trigger function for kpis
CREATE OR REPLACE FUNCTION public.log_kpi_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    INSERT INTO public.user_activity_logs (user_id, activity_type, entity_type, entity_id, organization_id)
    SELECT e.user_id, 'kpi_created', 'kpi', NEW.id, NEW.organization_id
    FROM public.employees e WHERE e.id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_kpi_activity
AFTER INSERT ON public.kpis
FOR EACH ROW EXECUTE FUNCTION public.log_kpi_activity();

-- Trigger function for attendance_records
CREATE OR REPLACE FUNCTION public.log_attendance_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity_logs (user_id, activity_type, entity_type, entity_id, organization_id)
  SELECT e.user_id, 'attendance_checked_in', 'attendance_record', NEW.id, NEW.organization_id
  FROM public.employees e WHERE e.id = NEW.employee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_attendance_activity
AFTER INSERT ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.log_attendance_activity();