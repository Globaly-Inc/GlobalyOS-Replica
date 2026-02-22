
CREATE TABLE public.feature_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'flagged' CHECK (category IN ('core', 'flagged')),
  subscription_tiers TEXT[] DEFAULT '{}',
  internal_notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read feature_registry"
  ON public.feature_registry FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage feature_registry"
  ON public.feature_registry FOR ALL
  USING (public.is_super_admin(auth.uid()));

INSERT INTO public.feature_registry (feature_name, label, description, category, sort_order) VALUES
  ('home', 'Home / Dashboard', 'Main dashboard with announcements, posts, and activity feed', 'core', 1),
  ('team_directory', 'Team Directory', 'Employee profiles, directory, and search', 'core', 2),
  ('team_calendar', 'Team Calendar', 'Shared calendar with events and holidays', 'core', 3),
  ('leave_management', 'Leave Management', 'Leave requests, approvals, and balances', 'core', 4),
  ('attendance', 'Attendance Tracking', 'Clock-in/out, timesheets, and attendance reports', 'core', 5),
  ('kpis_okrs', 'KPIs / OKRs', 'Key performance indicators and objectives tracking', 'core', 6),
  ('wiki', 'Wiki / Knowledge Base', 'Shared knowledge base with folders, pages, and AI Q&A', 'core', 7),
  ('performance_reviews', 'Performance Reviews', 'Review cycles, feedback, and evaluations', 'core', 8),
  ('org_chart', 'Org Chart', 'Organization hierarchy visualization', 'core', 9),
  ('growth', 'Growth', 'Career growth plans, skills, and development tracking', 'core', 10),
  ('notifications', 'Notifications', 'System notifications and alerts', 'core', 11),
  ('settings', 'Settings', 'Organization and user settings', 'core', 12),
  ('chat', 'Team Chat', 'Real-time messaging with spaces and direct messages', 'flagged', 13),
  ('tasks', 'Tasks', 'Task management and assignments', 'flagged', 14),
  ('crm', 'CRM', 'Customer relationship management', 'flagged', 15),
  ('workflows', 'Workflows', 'Onboarding & offboarding workflows', 'flagged', 16),
  ('payroll', 'Payroll', 'Salary processing, payslips, and tax calculations', 'flagged', 17),
  ('ask-ai', 'Ask AI', 'AI-powered assistant for questions and insights', 'flagged', 18),
  ('hiring', 'Hiring', 'Job vacancies, applicant tracking, and recruitment', 'flagged', 19),
  ('whatsapp', 'WhatsApp', 'WhatsApp inbox, broadcasts, and automations', 'flagged', 20),
  ('calls', 'Calls', 'Voice & video calls via Sendbird', 'flagged', 21),
  ('omnichannel_inbox', 'Omni-Channel Inbox', 'Unified inbox for WhatsApp, Telegram, Messenger & more', 'flagged', 22),
  ('ai_responder', 'AI Auto-Responder', 'AI-powered auto-replies with RAG knowledge retrieval', 'flagged', 23),
  ('telephony', 'Telephony', 'Twilio-powered SMS, outbound calling, IVR, and number provisioning', 'flagged', 24),
  ('forms', 'Forms', 'Form builder and submissions', 'flagged', 25),
  ('accounting', 'Accounting', 'Ledgers, invoicing, and financial management', 'flagged', 26),
  ('client_portal', 'Client Portal', 'Client self-service portal', 'flagged', 27);

CREATE TRIGGER update_feature_registry_updated_at
  BEFORE UPDATE ON public.feature_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
