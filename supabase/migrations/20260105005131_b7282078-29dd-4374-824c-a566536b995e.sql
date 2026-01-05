-- Drop the trigger that creates chat message notifications
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;