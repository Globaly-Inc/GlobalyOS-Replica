-- Add is_pinned column to ai_messages for pinned message feature
ALTER TABLE ai_messages 
ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient pinned message queries
CREATE INDEX idx_ai_messages_pinned ON ai_messages(conversation_id, is_pinned) WHERE is_pinned = true;