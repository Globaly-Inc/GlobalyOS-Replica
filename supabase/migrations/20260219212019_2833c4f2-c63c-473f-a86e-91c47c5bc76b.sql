
-- =============================================
-- OMNI-CHANNEL INBOX: Phase 1 Schema + Migration
-- =============================================

-- 1. Enums
CREATE TYPE public.inbox_channel_type AS ENUM ('whatsapp', 'telegram', 'messenger', 'instagram', 'tiktok', 'email');
CREATE TYPE public.inbox_conversation_status AS ENUM ('open', 'pending', 'snoozed', 'closed');
CREATE TYPE public.inbox_message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.inbox_message_type AS ENUM ('text', 'image', 'video', 'document', 'audio', 'template', 'interactive', 'system', 'note');
CREATE TYPE public.inbox_delivery_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

-- 2. inbox_channels
CREATE TABLE public.inbox_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_type public.inbox_channel_type NOT NULL,
  display_name TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_status TEXT NOT NULL DEFAULT 'disconnected',
  webhook_secret TEXT,
  last_webhook_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inbox channels"
  ON public.inbox_channels FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage inbox channels"
  ON public.inbox_channels FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- 3. inbox_contacts
CREATE TABLE public.inbox_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  handles JSONB NOT NULL DEFAULT '{}'::jsonb,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  consent JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inbox contacts"
  ON public.inbox_contacts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can manage inbox contacts"
  ON public.inbox_contacts FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update inbox contacts"
  ON public.inbox_contacts FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can delete inbox contacts"
  ON public.inbox_contacts FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 4. inbox_conversations
CREATE TABLE public.inbox_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_type public.inbox_channel_type NOT NULL,
  channel_id UUID REFERENCES public.inbox_channels(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES public.inbox_contacts(id) ON DELETE CASCADE,
  status public.inbox_conversation_status NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  tags TEXT[] NOT NULL DEFAULT '{}',
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  team_id UUID,
  subject TEXT,
  channel_thread_ref TEXT,
  last_message_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0,
  snoozed_until TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  sla_breach_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inbox conversations"
  ON public.inbox_conversations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert inbox conversations"
  ON public.inbox_conversations FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update inbox conversations"
  ON public.inbox_conversations FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can delete inbox conversations"
  ON public.inbox_conversations FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 5. inbox_messages
CREATE TABLE public.inbox_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  direction public.inbox_message_direction NOT NULL,
  msg_type public.inbox_message_type NOT NULL DEFAULT 'text',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  template_id UUID,
  provider_message_id TEXT,
  delivery_status public.inbox_delivery_status NOT NULL DEFAULT 'pending',
  delivery_status_updated_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  created_by UUID,
  created_by_type TEXT NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inbox messages"
  ON public.inbox_messages FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert inbox messages"
  ON public.inbox_messages FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update inbox messages"
  ON public.inbox_messages FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 6. inbox_macros
CREATE TABLE public.inbox_macros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  channel_compatibility public.inbox_channel_type[] NOT NULL DEFAULT '{}',
  variables TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inbox macros"
  ON public.inbox_macros FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can manage inbox macros"
  ON public.inbox_macros FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 7. inbox_ai_events
CREATE TABLE public.inbox_ai_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(4,3),
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version TEXT,
  reviewer_id UUID,
  reviewer_feedback TEXT,
  feedback_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_ai_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inbox AI events"
  ON public.inbox_ai_events FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert inbox AI events"
  ON public.inbox_ai_events FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update inbox AI events"
  ON public.inbox_ai_events FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- 8. inbox_webhook_events
CREATE TABLE public.inbox_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  channel_type public.inbox_channel_type NOT NULL,
  idempotency_key TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(idempotency_key)
);

ALTER TABLE public.inbox_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
  ON public.inbox_webhook_events FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- 9. Indexes
CREATE INDEX idx_inbox_conversations_org_status ON public.inbox_conversations(organization_id, status);
CREATE INDEX idx_inbox_conversations_assigned ON public.inbox_conversations(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_inbox_conversations_last_msg ON public.inbox_conversations(organization_id, last_message_at DESC);
CREATE INDEX idx_inbox_messages_conversation ON public.inbox_messages(conversation_id, created_at);
CREATE INDEX idx_inbox_messages_provider ON public.inbox_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_inbox_contacts_phone ON public.inbox_contacts(organization_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_inbox_contacts_email ON public.inbox_contacts(organization_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_inbox_contacts_crm ON public.inbox_contacts(crm_contact_id) WHERE crm_contact_id IS NOT NULL;
CREATE INDEX idx_inbox_webhook_idempotency ON public.inbox_webhook_events(idempotency_key);
CREATE INDEX idx_inbox_ai_events_conversation ON public.inbox_ai_events(conversation_id);

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;

-- 11. Updated_at triggers
CREATE TRIGGER update_inbox_channels_updated_at
  BEFORE UPDATE ON public.inbox_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inbox_contacts_updated_at
  BEFORE UPDATE ON public.inbox_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inbox_conversations_updated_at
  BEFORE UPDATE ON public.inbox_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inbox_macros_updated_at
  BEFORE UPDATE ON public.inbox_macros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Migrate existing WhatsApp data into inbox tables
-- (contacts)
INSERT INTO public.inbox_contacts (organization_id, phone, name, tags, custom_fields, consent, created_at, updated_at)
SELECT
  organization_id,
  phone,
  name,
  tags,
  custom_fields,
  jsonb_build_object('whatsapp', jsonb_build_object(
    'status', opt_in_status,
    'source', opt_in_source,
    'opted_in_at', opt_in_at
  )),
  created_at,
  updated_at
FROM public.wa_contacts
ON CONFLICT DO NOTHING;

-- (channels from wa_accounts)
INSERT INTO public.inbox_channels (organization_id, channel_type, display_name, credentials, webhook_status, webhook_secret, config, created_at, updated_at)
SELECT
  organization_id,
  'whatsapp'::public.inbox_channel_type,
  COALESCE(display_name, display_phone, 'WhatsApp'),
  jsonb_build_object('waba_id', waba_id, 'phone_number_id', phone_number_id, 'display_phone', display_phone),
  CASE WHEN status = 'connected' THEN 'connected' ELSE 'disconnected' END,
  webhook_secret,
  jsonb_build_object('frequency_cap_per_day', frequency_cap_per_day, 'business_hours', business_hours),
  created_at,
  updated_at
FROM public.wa_accounts
ON CONFLICT DO NOTHING;
