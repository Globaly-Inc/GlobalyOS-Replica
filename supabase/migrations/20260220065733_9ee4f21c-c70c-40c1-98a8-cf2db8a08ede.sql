
-- Gmail sync state: tracks history ID for incremental sync per user
CREATE TABLE public.inbox_gmail_sync_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  gmail_history_id TEXT,
  gmail_email TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.inbox_gmail_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org gmail sync state"
  ON public.inbox_gmail_sync_state FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own gmail sync state"
  ON public.inbox_gmail_sync_state FOR ALL
  USING (user_id = auth.uid());

-- Gmail thread map: links Gmail thread IDs to inbox conversations
CREATE TABLE public.inbox_gmail_thread_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  gmail_thread_id TEXT NOT NULL,
  gmail_message_ids TEXT[] DEFAULT '{}',
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, gmail_thread_id)
);

ALTER TABLE public.inbox_gmail_thread_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org gmail thread map"
  ON public.inbox_gmail_thread_map FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own org gmail thread map"
  ON public.inbox_gmail_thread_map FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- Index for fast lookups
CREATE INDEX idx_gmail_thread_map_thread_id ON public.inbox_gmail_thread_map(gmail_thread_id);
CREATE INDEX idx_gmail_thread_map_conversation ON public.inbox_gmail_thread_map(conversation_id);
CREATE INDEX idx_gmail_sync_state_org ON public.inbox_gmail_sync_state(organization_id);
