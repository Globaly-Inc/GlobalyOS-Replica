
-- ============================================================
-- WhatsApp Module — Milestone 1: Tables, Enums, RLS, Feature Flag
-- ============================================================

-- Enums
CREATE TYPE public.wa_opt_in_status AS ENUM ('opted_in', 'opted_out', 'pending');
CREATE TYPE public.wa_conversation_status AS ENUM ('open', 'assigned', 'resolved', 'closed');
CREATE TYPE public.wa_message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.wa_message_type AS ENUM ('text', 'image', 'video', 'document', 'template', 'interactive', 'flow');
CREATE TYPE public.wa_message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE public.wa_template_category AS ENUM ('marketing', 'utility', 'authentication');
CREATE TYPE public.wa_template_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE public.wa_campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');
CREATE TYPE public.wa_automation_status AS ENUM ('draft', 'active', 'paused');
CREATE TYPE public.wa_automation_trigger AS ENUM ('message_received', 'keyword', 'new_contact', 'tag_added', 'flow_submitted');

-- 1. wa_accounts
CREATE TABLE public.wa_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  display_phone TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  webhook_secret TEXT,
  business_hours JSONB DEFAULT '{}',
  frequency_cap_per_day INT DEFAULT 10,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.wa_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_accounts: org members can view"
  ON public.wa_accounts FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_accounts: admins can manage"
  ON public.wa_accounts FOR ALL
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- 2. wa_contacts
CREATE TABLE public.wa_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  opt_in_status public.wa_opt_in_status NOT NULL DEFAULT 'pending',
  opt_in_source TEXT,
  opt_in_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, phone)
);

ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_contacts: org members can view"
  ON public.wa_contacts FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_contacts: org members can insert"
  ON public.wa_contacts FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_contacts: org members can update"
  ON public.wa_contacts FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_contacts: org members can delete"
  ON public.wa_contacts FOR DELETE
  USING (is_org_member(auth.uid(), organization_id));

-- 3. wa_conversations
CREATE TABLE public.wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  wa_contact_id UUID NOT NULL REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
  status public.wa_conversation_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  window_open_until TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  unread_count INT NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_conversations: org members can view"
  ON public.wa_conversations FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_conversations: org members can insert"
  ON public.wa_conversations FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_conversations: org members can update"
  ON public.wa_conversations FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

-- 4. wa_messages
CREATE TABLE public.wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  direction public.wa_message_direction NOT NULL,
  msg_type public.wa_message_type NOT NULL DEFAULT 'text',
  content JSONB NOT NULL DEFAULT '{}',
  wa_message_id TEXT,
  template_id UUID,
  status public.wa_message_status NOT NULL DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wa_message_id)
);

ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_messages: org members can view"
  ON public.wa_messages FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_messages: org members can insert"
  ON public.wa_messages FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_messages: org members can update"
  ON public.wa_messages FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

-- 5. wa_templates
CREATE TABLE public.wa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.wa_template_category NOT NULL DEFAULT 'utility',
  language TEXT NOT NULL DEFAULT 'en',
  components JSONB NOT NULL DEFAULT '[]',
  status public.wa_template_status NOT NULL DEFAULT 'draft',
  external_template_id TEXT,
  rejection_reason TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_templates: org members can view"
  ON public.wa_templates FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_templates: admins can manage"
  ON public.wa_templates FOR ALL
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- 6. wa_campaigns
CREATE TABLE public.wa_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.wa_templates(id) ON DELETE SET NULL,
  variable_mapping JSONB DEFAULT '{}',
  audience_source TEXT DEFAULT 'wa_contacts',
  audience_filters JSONB DEFAULT '{}',
  status public.wa_campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{"total":0,"sent":0,"delivered":0,"read":0,"failed":0,"replied":0}',
  throttle_per_second INT DEFAULT 10,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_campaigns: org members can view"
  ON public.wa_campaigns FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_campaigns: org members can insert"
  ON public.wa_campaigns FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_campaigns: org members can update"
  ON public.wa_campaigns FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_campaigns: org members can delete"
  ON public.wa_campaigns FOR DELETE
  USING (is_org_member(auth.uid(), organization_id));

-- 7. wa_automations
CREATE TABLE public.wa_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type public.wa_automation_trigger NOT NULL DEFAULT 'message_received',
  trigger_config JSONB DEFAULT '{}',
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  status public.wa_automation_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_automations: org members can view"
  ON public.wa_automations FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_automations: org members can insert"
  ON public.wa_automations FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_automations: org members can update"
  ON public.wa_automations FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "wa_automations: org members can delete"
  ON public.wa_automations FOR DELETE
  USING (is_org_member(auth.uid(), organization_id));

-- 8. wa_audit_log (append-only for compliance)
CREATE TABLE public.wa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_audit_log: admins can view"
  ON public.wa_audit_log FOR SELECT
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "wa_audit_log: org members can insert"
  ON public.wa_audit_log FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Enable realtime for inbox
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;

-- Indexes
CREATE INDEX idx_wa_contacts_org_phone ON public.wa_contacts(organization_id, phone);
CREATE INDEX idx_wa_conversations_org_status ON public.wa_conversations(organization_id, status);
CREATE INDEX idx_wa_conversations_contact ON public.wa_conversations(wa_contact_id);
CREATE INDEX idx_wa_messages_conversation ON public.wa_messages(conversation_id, created_at);
CREATE INDEX idx_wa_messages_wa_id ON public.wa_messages(wa_message_id);
CREATE INDEX idx_wa_campaigns_org_status ON public.wa_campaigns(organization_id, status);
CREATE INDEX idx_wa_audit_log_org ON public.wa_audit_log(organization_id, created_at);

-- Feature flag: insert 'whatsapp' for all existing orgs (disabled by default)
INSERT INTO public.organization_features (organization_id, feature_name, is_enabled)
SELECT id, 'whatsapp', false FROM public.organizations
ON CONFLICT DO NOTHING;

-- Updated_at triggers
CREATE TRIGGER update_wa_accounts_updated_at BEFORE UPDATE ON public.wa_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wa_contacts_updated_at BEFORE UPDATE ON public.wa_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wa_conversations_updated_at BEFORE UPDATE ON public.wa_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wa_templates_updated_at BEFORE UPDATE ON public.wa_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wa_campaigns_updated_at BEFORE UPDATE ON public.wa_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wa_automations_updated_at BEFORE UPDATE ON public.wa_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
