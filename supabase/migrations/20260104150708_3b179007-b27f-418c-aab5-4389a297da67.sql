-- Drop call-related tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.call_recordings CASCADE;
DROP TABLE IF EXISTS public.call_signaling CASCADE;
DROP TABLE IF EXISTS public.call_participants CASCADE;
DROP TABLE IF EXISTS public.call_sessions CASCADE;

-- Remove call_log_data column from chat_messages if it exists
ALTER TABLE public.chat_messages 
DROP COLUMN IF EXISTS call_log_data;