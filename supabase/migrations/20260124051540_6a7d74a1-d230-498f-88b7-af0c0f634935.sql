-- Add sharing columns to ai_conversations
ALTER TABLE public.ai_conversations 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'specific'));

-- Add sender tracking to ai_messages for multi-user attribution
ALTER TABLE public.ai_messages 
ADD COLUMN IF NOT EXISTS sender_employee_id UUID REFERENCES public.employees(id);

-- Create participants table for specific sharing
CREATE TABLE public.ai_conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  added_by UUID REFERENCES auth.users(id),
  can_send_messages BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, employee_id)
);

-- Create internal notes table (NOT sent to AI)
CREATE TABLE public.ai_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentioned_employee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_ai_conversation_participants_conv ON public.ai_conversation_participants(conversation_id);
CREATE INDEX idx_ai_conversation_participants_emp ON public.ai_conversation_participants(employee_id);
CREATE INDEX idx_ai_internal_notes_conversation ON public.ai_internal_notes(conversation_id, created_at);
CREATE INDEX idx_ai_internal_notes_mentions ON public.ai_internal_notes USING gin(mentioned_employee_ids);

-- Enable RLS
ALTER TABLE public.ai_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_internal_notes ENABLE ROW LEVEL SECURITY;

-- RLS for participants table
CREATE POLICY "Users can view participants of their conversations"
  ON public.ai_conversation_participants FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    ) AND (
      -- Owner of the conversation
      conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid())
      OR
      -- Participant in the conversation
      employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Conversation owners can manage participants"
  ON public.ai_conversation_participants FOR INSERT
  WITH CHECK (
    conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid())
  );

CREATE POLICY "Conversation owners can remove participants"
  ON public.ai_conversation_participants FOR DELETE
  USING (
    conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid())
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS for internal notes
CREATE POLICY "Users can view notes in their conversations"
  ON public.ai_internal_notes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    ) AND (
      -- Owner of the conversation
      conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid())
      OR
      -- Participant in the conversation
      conversation_id IN (
        SELECT conversation_id FROM public.ai_conversation_participants 
        WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create notes in participated conversations"
  ON public.ai_internal_notes FOR INSERT
  WITH CHECK (
    author_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    AND (
      conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid())
      OR conversation_id IN (
        SELECT conversation_id FROM public.ai_conversation_participants 
        WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Authors can update their own notes"
  ON public.ai_internal_notes FOR UPDATE
  USING (author_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Authors can delete their own notes"
  ON public.ai_internal_notes FOR DELETE
  USING (author_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Enable realtime for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_internal_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversation_participants;