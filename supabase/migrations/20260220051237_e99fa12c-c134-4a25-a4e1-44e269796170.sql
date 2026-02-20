
-- Call recordings table
CREATE TABLE public.call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES public.org_phone_numbers(id) ON DELETE SET NULL,
  call_sid TEXT NOT NULL,
  recording_sid TEXT,
  recording_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  direction TEXT NOT NULL DEFAULT 'inbound',
  from_number TEXT,
  to_number TEXT,
  transcription_text TEXT,
  transcription_status TEXT DEFAULT 'none',
  ai_summary TEXT,
  ai_summary_generated_at TIMESTAMPTZ,
  ai_topics TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org recordings" ON public.call_recordings
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own org recordings" ON public.call_recordings
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )) WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_call_recordings_org ON public.call_recordings(organization_id);
CREATE INDEX idx_call_recordings_call_sid ON public.call_recordings(call_sid);

-- Call recording settings per org
CREATE TABLE public.call_recording_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  auto_record_all BOOLEAN DEFAULT false,
  auto_record_inbound BOOLEAN DEFAULT false,
  auto_record_outbound BOOLEAN DEFAULT false,
  auto_transcribe BOOLEAN DEFAULT false,
  auto_summarize BOOLEAN DEFAULT false,
  retention_days INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_recording_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org recording settings" ON public.call_recording_settings
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own org recording settings" ON public.call_recording_settings
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )) WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- Call campaigns table
CREATE TABLE public.call_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phone_number_id UUID REFERENCES public.org_phone_numbers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_contacts INTEGER DEFAULT 0,
  completed_calls INTEGER DEFAULT 0,
  connected_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER DEFAULT 0,
  voicemail_drop_text TEXT,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org campaigns" ON public.call_campaigns
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own org campaigns" ON public.call_campaigns
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )) WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_call_campaigns_org ON public.call_campaigns(organization_id);

-- Campaign contacts
CREATE TABLE public.call_campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.call_campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_name TEXT,
  phone_number TEXT NOT NULL,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  call_sid TEXT,
  duration_seconds INTEGER,
  outcome TEXT,
  notes TEXT,
  called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org campaign contacts" ON public.call_campaign_contacts
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own org campaign contacts" ON public.call_campaign_contacts
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )) WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_campaign_contacts_campaign ON public.call_campaign_contacts(campaign_id);

-- Call queues
CREATE TABLE public.call_queues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT NOT NULL DEFAULT 'round_robin',
  max_wait_seconds INTEGER DEFAULT 300,
  max_queue_size INTEGER DEFAULT 20,
  hold_music_url TEXT,
  hold_message TEXT DEFAULT 'All agents are currently busy. Please hold.',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_queues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org queues" ON public.call_queues
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own org queues" ON public.call_queues
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )) WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- Queue members
CREATE TABLE public.call_queue_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID NOT NULL REFERENCES public.call_queues(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(queue_id, employee_id)
);

ALTER TABLE public.call_queue_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org queue members" ON public.call_queue_members
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own org queue members" ON public.call_queue_members
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )) WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_call_recordings_updated_at BEFORE UPDATE ON public.call_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_recording_settings_updated_at BEFORE UPDATE ON public.call_recording_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_campaigns_updated_at BEFORE UPDATE ON public.call_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_queues_updated_at BEFORE UPDATE ON public.call_queues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
