
-- Storage bucket for inbox attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('inbox-attachments', 'inbox-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for inbox-attachments bucket
CREATE POLICY "Authenticated users can upload inbox attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inbox-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read inbox attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'inbox-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete own inbox attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'inbox-attachments' AND auth.uid() IS NOT NULL);

-- Activity log table for inbox conversations
CREATE TABLE IF NOT EXISTS public.inbox_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  conversation_id UUID NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL, -- 'status_change', 'priority_change', 'tag_add', 'tag_remove', 'assigned', 'unassigned', 'ai_draft', 'ai_auto_send', 'note_added'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity for their org"
ON public.inbox_activity_log FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert activity for their org"
ON public.inbox_activity_log FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_inbox_activity_log_conv ON public.inbox_activity_log(conversation_id, created_at DESC);

-- Enable realtime for activity log
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_activity_log;
