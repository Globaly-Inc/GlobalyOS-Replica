-- Add icon_url column to chat_conversations for group chat icons
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS icon_url text;

-- Comment for clarity
COMMENT ON COLUMN public.chat_conversations.icon_url IS 'URL to the group chat icon image';