-- Create chat_favorites table for user-specific favorite conversations and spaces
CREATE TABLE public.chat_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.chat_spaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT favorite_type_check CHECK (
    (conversation_id IS NOT NULL AND space_id IS NULL) OR
    (conversation_id IS NULL AND space_id IS NOT NULL)
  ),
  CONSTRAINT unique_employee_conversation UNIQUE(employee_id, conversation_id),
  CONSTRAINT unique_employee_space UNIQUE(employee_id, space_id)
);

-- Create indexes for performance
CREATE INDEX idx_chat_favorites_employee ON public.chat_favorites(employee_id);
CREATE INDEX idx_chat_favorites_organization ON public.chat_favorites(organization_id);
CREATE INDEX idx_chat_favorites_conversation ON public.chat_favorites(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_chat_favorites_space ON public.chat_favorites(space_id) WHERE space_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.chat_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own favorites within their organization
CREATE POLICY "Users can view own favorites"
ON public.chat_favorites
FOR SELECT
USING (employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() AND organization_id = chat_favorites.organization_id));

CREATE POLICY "Users can add own favorites"
ON public.chat_favorites
FOR INSERT
WITH CHECK (employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() AND organization_id = chat_favorites.organization_id));

CREATE POLICY "Users can remove own favorites"
ON public.chat_favorites
FOR DELETE
USING (employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() AND organization_id = chat_favorites.organization_id));

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_favorites;