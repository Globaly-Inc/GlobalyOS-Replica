
-- =============================================
-- CLIENT PORTAL: Full Database Schema
-- =============================================

-- 1. client_portal_settings
CREATE TABLE public.client_portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  branding_logo_url TEXT,
  branding_primary_color TEXT DEFAULT '#3B82F6',
  branding_company_name TEXT,
  otp_expiry_minutes INTEGER NOT NULL DEFAULT 10,
  otp_max_attempts INTEGER NOT NULL DEFAULT 5,
  otp_lockout_minutes INTEGER NOT NULL DEFAULT 15,
  ai_auto_reply_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);
ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;

-- 2. client_portal_offices
CREATE TABLE public.client_portal_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, office_id)
);
ALTER TABLE public.client_portal_offices ENABLE ROW LEVEL SECURITY;

-- 3. client_portal_users
CREATE TABLE public.client_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('active','suspended','invited')),
  primary_office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);
ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;

-- 4. client_portal_otp_codes
CREATE TABLE public.client_portal_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  locked_until TIMESTAMPTZ,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_portal_otp_codes ENABLE ROW LEVEL SECURITY;

-- 5. client_portal_sessions
CREATE TABLE public.client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;

-- 6. client_cases
CREATE TABLE public.client_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  client_user_id UUID NOT NULL REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','pending','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  workflow_template_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_cases ENABLE ROW LEVEL SECURITY;

-- 7. client_case_status_history
CREATE TABLE public.client_case_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.client_cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  created_by_type TEXT NOT NULL DEFAULT 'staff' CHECK (created_by_type IN ('staff','system','ai')),
  created_by_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_case_status_history ENABLE ROW LEVEL SECURITY;

-- 8. client_case_milestones
CREATE TABLE public.client_case_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.client_cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_case_milestones ENABLE ROW LEVEL SECURITY;

-- 9. client_threads
CREATE TABLE public.client_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.client_cases(id) ON DELETE CASCADE,
  subject TEXT,
  unread_by_client INTEGER NOT NULL DEFAULT 0,
  unread_by_staff INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_threads ENABLE ROW LEVEL SECURITY;

-- 10. client_messages
CREATE TABLE public.client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.client_threads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client','staff','ai','system')),
  sender_id TEXT,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  ai_confidence NUMERIC(4,3),
  ai_sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- 11. client_documents
CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.client_cases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  file_size BIGINT,
  document_type TEXT NOT NULL DEFAULT 'uploaded' CHECK (document_type IN ('requested','uploaded')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES public.client_documents(id) ON DELETE SET NULL,
  review_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  uploaded_by_type TEXT CHECK (uploaded_by_type IN ('client','staff')),
  uploaded_by_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- 12. client_tasks
CREATE TABLE public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.client_cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'custom' CHECK (task_type IN ('upload_doc','fill_form','approve','pay','custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

-- 13. client_notifications
CREATE TABLE public.client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('message','status_change','task','document','system')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

-- 14. client_portal_audit_logs
CREATE TABLE public.client_portal_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('client','staff','system','ai')),
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_portal_audit_logs ENABLE ROW LEVEL SECURITY;

-- 15. client_ai_interactions
CREATE TABLE public.client_ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.client_threads(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.client_cases(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('draft_reply','auto_reply','summarize','extract_actions')),
  prompt_summary TEXT,
  response TEXT,
  sources_used JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC(4,3),
  staff_rating INTEGER CHECK (staff_rating BETWEEN 1 AND 5),
  staff_feedback TEXT,
  was_sent_to_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_ai_interactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Storage bucket for client portal documents
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('client-portal-documents', 'client-portal-documents', false);

-- =============================================
-- RLS Policies (Staff access via org membership)
-- =============================================

-- Helper: check if user is member of org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- client_portal_settings: staff in org can read/write
CREATE POLICY "Staff can view portal settings" ON public.client_portal_settings
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Staff can insert portal settings" ON public.client_portal_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Staff can update portal settings" ON public.client_portal_settings
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- client_portal_offices
CREATE POLICY "Staff can manage portal offices" ON public.client_portal_offices
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- client_portal_users
CREATE POLICY "Staff can manage portal users" ON public.client_portal_users
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- client_portal_otp_codes: no direct access, only via edge functions
CREATE POLICY "No direct OTP access" ON public.client_portal_otp_codes
  FOR ALL TO authenticated USING (false);

-- client_portal_sessions: no direct access, only via edge functions
CREATE POLICY "No direct session access" ON public.client_portal_sessions
  FOR ALL TO authenticated USING (false);

-- client_cases
CREATE POLICY "Staff can manage cases" ON public.client_cases
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- client_case_status_history
CREATE POLICY "Staff can manage status history" ON public.client_case_status_history
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.client_cases c WHERE c.id = case_id AND public.is_org_member(auth.uid(), c.organization_id))
  );

-- client_case_milestones
CREATE POLICY "Staff can manage milestones" ON public.client_case_milestones
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.client_cases c WHERE c.id = case_id AND public.is_org_member(auth.uid(), c.organization_id))
  );

-- client_threads
CREATE POLICY "Staff can manage threads" ON public.client_threads
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- client_messages
CREATE POLICY "Staff can manage messages" ON public.client_messages
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.client_threads t WHERE t.id = thread_id AND public.is_org_member(auth.uid(), t.organization_id))
  );

-- client_documents
CREATE POLICY "Staff can manage documents" ON public.client_documents
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- client_tasks
CREATE POLICY "Staff can manage tasks" ON public.client_tasks
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.client_cases c WHERE c.id = case_id AND public.is_org_member(auth.uid(), c.organization_id))
  );

-- client_notifications
CREATE POLICY "Staff can manage notifications" ON public.client_notifications
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- client_portal_audit_logs
CREATE POLICY "Staff can view audit logs" ON public.client_portal_audit_logs
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- client_ai_interactions
CREATE POLICY "Staff can manage AI interactions" ON public.client_ai_interactions
  FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Storage policies for client-portal-documents
CREATE POLICY "Staff can upload portal docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-portal-documents');
CREATE POLICY "Staff can view portal docs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'client-portal-documents');
CREATE POLICY "Staff can delete portal docs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'client-portal-documents');

-- Enable realtime for messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_notifications;

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_client_portal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_client_portal_settings_updated_at
  BEFORE UPDATE ON public.client_portal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_client_portal_updated_at();

CREATE TRIGGER update_client_portal_users_updated_at
  BEFORE UPDATE ON public.client_portal_users
  FOR EACH ROW EXECUTE FUNCTION public.update_client_portal_updated_at();

CREATE TRIGGER update_client_cases_updated_at
  BEFORE UPDATE ON public.client_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_client_portal_updated_at();

-- Indexes for performance
CREATE INDEX idx_client_cases_org_client ON public.client_cases(organization_id, client_user_id);
CREATE INDEX idx_client_cases_status ON public.client_cases(organization_id, status);
CREATE INDEX idx_client_messages_thread ON public.client_messages(thread_id, created_at);
CREATE INDEX idx_client_threads_case ON public.client_threads(case_id);
CREATE INDEX idx_client_documents_case ON public.client_documents(case_id);
CREATE INDEX idx_client_tasks_case ON public.client_tasks(case_id);
CREATE INDEX idx_client_notifications_user ON public.client_notifications(client_user_id, read_at);
CREATE INDEX idx_client_otp_email ON public.client_portal_otp_codes(organization_id, email, created_at);
CREATE INDEX idx_client_sessions_token ON public.client_portal_sessions(token_hash);
CREATE INDEX idx_client_audit_org ON public.client_portal_audit_logs(organization_id, created_at);
