-- Create enum for space types
CREATE TYPE chat_space_type AS ENUM ('collaboration', 'announcements');

-- Create enum for space access
CREATE TYPE chat_space_access AS ENUM ('public', 'private');

-- Chat conversations table (for DMs and group chats)
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat conversation participants
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(conversation_id, employee_id)
);

-- Chat spaces (channels)
CREATE TABLE public.chat_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  space_type chat_space_type NOT NULL DEFAULT 'collaboration',
  access_type chat_space_access NOT NULL DEFAULT 'public',
  history_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat space members
CREATE TABLE public.chat_space_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.chat_spaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  notification_setting TEXT NOT NULL DEFAULT 'all',
  UNIQUE(space_id, employee_id)
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.chat_spaces(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_context_check CHECK (
    (conversation_id IS NOT NULL AND space_id IS NULL) OR
    (conversation_id IS NULL AND space_id IS NOT NULL)
  )
);

-- Chat message attachments
CREATE TABLE public.chat_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat message mentions
CREATE TABLE public.chat_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, employee_id)
);

-- Chat pinned resources (for spaces/conversations)
CREATE TABLE public.chat_pinned_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.chat_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  file_path TEXT,
  pinned_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT chat_pinned_resources_context_check CHECK (
    (conversation_id IS NOT NULL AND space_id IS NULL) OR
    (conversation_id IS NULL AND space_id IS NOT NULL)
  )
);

-- Chat user presence/typing status
CREATE TABLE public.chat_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  typing_in_conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  typing_in_space_id UUID REFERENCES public.chat_spaces(id) ON DELETE SET NULL,
  UNIQUE(employee_id)
);

-- Create indexes for performance
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_space ON public.chat_messages(space_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_participants_employee ON public.chat_participants(employee_id);
CREATE INDEX idx_chat_space_members_employee ON public.chat_space_members(employee_id);
CREATE INDEX idx_chat_presence_employee ON public.chat_presence(employee_id);

-- Enable RLS on all tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_pinned_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view conversations they participate in"
  ON public.chat_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id = id
      AND cp.employee_id = get_current_employee_id()
    )
  );

CREATE POLICY "Users can create conversations in their org"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Participants can update conversation"
  ON public.chat_conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id = id
      AND cp.employee_id = get_current_employee_id()
    )
  );

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their conversations"
  ON public.chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id = chat_participants.conversation_id
      AND cp.employee_id = get_current_employee_id()
    )
  );

CREATE POLICY "Users can add participants to their conversations"
  ON public.chat_participants FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update their own participation"
  ON public.chat_participants FOR UPDATE
  USING (employee_id = get_current_employee_id());

CREATE POLICY "Users can leave conversations"
  ON public.chat_participants FOR DELETE
  USING (employee_id = get_current_employee_id());

-- RLS Policies for chat_spaces
CREATE POLICY "Users can view public spaces in their org"
  ON public.chat_spaces FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id) AND (
      access_type = 'public' OR
      EXISTS (
        SELECT 1 FROM public.chat_space_members csm
        WHERE csm.space_id = id
        AND csm.employee_id = get_current_employee_id()
      )
    )
  );

CREATE POLICY "Users can create spaces in their org"
  ON public.chat_spaces FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Space admins can update spaces"
  ON public.chat_spaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_space_members csm
      WHERE csm.space_id = id
      AND csm.employee_id = get_current_employee_id()
      AND csm.role = 'admin'
    ) OR created_by = get_current_employee_id()
  );

CREATE POLICY "Space creators can delete spaces"
  ON public.chat_spaces FOR DELETE
  USING (created_by = get_current_employee_id());

-- RLS Policies for chat_space_members
CREATE POLICY "Users can view members of accessible spaces"
  ON public.chat_space_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_spaces cs
      WHERE cs.id = space_id
      AND is_org_member(auth.uid(), cs.organization_id)
      AND (cs.access_type = 'public' OR EXISTS (
        SELECT 1 FROM public.chat_space_members csm2
        WHERE csm2.space_id = cs.id
        AND csm2.employee_id = get_current_employee_id()
      ))
    )
  );

CREATE POLICY "Space admins can manage members"
  ON public.chat_space_members FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) AND (
      EXISTS (
        SELECT 1 FROM public.chat_space_members csm
        WHERE csm.space_id = chat_space_members.space_id
        AND csm.employee_id = get_current_employee_id()
        AND csm.role = 'admin'
      ) OR EXISTS (
        SELECT 1 FROM public.chat_spaces cs
        WHERE cs.id = space_id AND cs.access_type = 'public'
      )
    )
  );

CREATE POLICY "Users can update their own membership"
  ON public.chat_space_members FOR UPDATE
  USING (employee_id = get_current_employee_id());

CREATE POLICY "Users can leave spaces"
  ON public.chat_space_members FOR DELETE
  USING (employee_id = get_current_employee_id());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations/spaces"
  ON public.chat_messages FOR SELECT
  USING (
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id = chat_messages.conversation_id
      AND cp.employee_id = get_current_employee_id()
    )) OR
    (space_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_space_members csm
      WHERE csm.space_id = chat_messages.space_id
      AND csm.employee_id = get_current_employee_id()
    ))
  );

CREATE POLICY "Users can send messages to their conversations/spaces"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) AND
    sender_id = get_current_employee_id() AND (
      (conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.conversation_id = chat_messages.conversation_id
        AND cp.employee_id = get_current_employee_id()
      )) OR
      (space_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chat_space_members csm
        WHERE csm.space_id = chat_messages.space_id
        AND csm.employee_id = get_current_employee_id()
      ))
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.chat_messages FOR UPDATE
  USING (sender_id = get_current_employee_id());

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  USING (sender_id = get_current_employee_id());

-- RLS Policies for chat_attachments
CREATE POLICY "Users can view attachments in their messages"
  ON public.chat_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = message_id
      AND (
        (cm.conversation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.chat_participants cp
          WHERE cp.conversation_id = cm.conversation_id
          AND cp.employee_id = get_current_employee_id()
        )) OR
        (cm.space_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.chat_space_members csm
          WHERE csm.space_id = cm.space_id
          AND csm.employee_id = get_current_employee_id()
        ))
      )
    )
  );

CREATE POLICY "Users can add attachments to their messages"
  ON public.chat_attachments FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- RLS Policies for chat_mentions
CREATE POLICY "Users can view mentions in accessible messages"
  ON public.chat_mentions FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create mentions"
  ON public.chat_mentions FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- RLS Policies for chat_pinned_resources
CREATE POLICY "Users can view pinned resources"
  ON public.chat_pinned_resources FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can pin resources"
  ON public.chat_pinned_resources FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can unpin their resources"
  ON public.chat_pinned_resources FOR DELETE
  USING (pinned_by = get_current_employee_id());

-- RLS Policies for chat_presence
CREATE POLICY "Users can view presence in their org"
  ON public.chat_presence FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage their own presence"
  ON public.chat_presence FOR ALL
  USING (employee_id = get_current_employee_id())
  WITH CHECK (employee_id = get_current_employee_id());

-- Enable realtime for chat messages and presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_presence;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view chat attachments in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);