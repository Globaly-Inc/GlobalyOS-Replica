-- Add call_log_data column to chat_messages for storing call log metadata
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS call_log_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN chat_messages.call_log_data IS 
'Stores call log metadata when content_type is call_log. Contains call_id, call_type, status, duration_seconds, participants, etc.';