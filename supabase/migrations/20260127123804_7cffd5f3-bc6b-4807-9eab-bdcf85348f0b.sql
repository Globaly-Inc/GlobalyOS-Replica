-- Add system_event_data JSONB column to chat_messages for storing event metadata
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS system_event_data JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.chat_messages.system_event_data IS 'Stores metadata for system events like member additions, removals, role changes. Structure: {event_type, target_employee_id, target_name, actor_employee_id?, actor_name?}';