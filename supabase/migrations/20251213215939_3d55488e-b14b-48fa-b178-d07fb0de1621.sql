-- Create function to notify chat message recipients
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  chat_name TEXT;
  recipient_user_id UUID;
  notification_url TEXT;
BEGIN
  -- Get sender name
  SELECT p.full_name INTO sender_name
  FROM employees e
  JOIN profiles p ON p.id = e.user_id
  WHERE e.id = NEW.sender_id;

  -- Handle conversation messages
  IF NEW.conversation_id IS NOT NULL THEN
    -- Get conversation name/other participant
    SELECT 
      COALESCE(c.name, p.full_name) INTO chat_name
    FROM chat_conversations c
    LEFT JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.employee_id != NEW.sender_id
    LEFT JOIN employees e ON e.id = cp.employee_id
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE c.id = NEW.conversation_id
    LIMIT 1;

    -- Notify all participants except sender
    FOR recipient_user_id IN
      SELECT e.user_id
      FROM chat_participants cp
      JOIN employees e ON e.id = cp.employee_id
      WHERE cp.conversation_id = NEW.conversation_id
        AND cp.employee_id != NEW.sender_id
    LOOP
      -- Create in-app notification
      INSERT INTO notifications (
        user_id,
        organization_id,
        type,
        title,
        message,
        reference_type,
        reference_id,
        actor_id
      ) VALUES (
        recipient_user_id,
        NEW.organization_id,
        'chat_message',
        'New message from ' || COALESCE(sender_name, 'Someone'),
        LEFT(NEW.content, 100),
        'chat_conversation',
        NEW.conversation_id,
        NEW.sender_id
      );
    END LOOP;

  -- Handle space messages
  ELSIF NEW.space_id IS NOT NULL THEN
    -- Get space name
    SELECT name INTO chat_name
    FROM chat_spaces
    WHERE id = NEW.space_id;

    -- Notify all space members except sender
    FOR recipient_user_id IN
      SELECT e.user_id
      FROM chat_space_members csm
      JOIN employees e ON e.id = csm.employee_id
      WHERE csm.space_id = NEW.space_id
        AND csm.employee_id != NEW.sender_id
        AND csm.notification_setting != 'none'
    LOOP
      -- Create in-app notification
      INSERT INTO notifications (
        user_id,
        organization_id,
        type,
        title,
        message,
        reference_type,
        reference_id,
        actor_id
      ) VALUES (
        recipient_user_id,
        NEW.organization_id,
        'chat_message',
        sender_name || ' in ' || COALESCE(chat_name, 'a space'),
        LEFT(NEW.content, 100),
        'chat_space',
        NEW.space_id,
        NEW.sender_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for chat message notifications
DROP TRIGGER IF EXISTS on_chat_message_notify ON chat_messages;
CREATE TRIGGER on_chat_message_notify
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_message();

-- Create function to handle @mentions in chat
CREATE OR REPLACE FUNCTION public.process_chat_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mention_record RECORD;
  mentioned_user_id UUID;
  sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT p.full_name INTO sender_name
  FROM employees e
  JOIN profiles p ON p.id = e.user_id
  WHERE e.id = NEW.sender_id;

  -- Process each mention for this message
  FOR mention_record IN
    SELECT * FROM chat_mentions
    WHERE message_id = NEW.id
  LOOP
    -- Get the mentioned employee's user_id
    SELECT e.user_id INTO mentioned_user_id
    FROM employees e
    WHERE e.id = mention_record.employee_id;

    IF mentioned_user_id IS NOT NULL THEN
      -- Create notification for the mentioned user
      INSERT INTO notifications (
        user_id,
        organization_id,
        type,
        title,
        message,
        reference_type,
        reference_id,
        actor_id
      ) VALUES (
        mentioned_user_id,
        NEW.organization_id,
        'chat_mention',
        sender_name || ' mentioned you',
        LEFT(NEW.content, 100),
        CASE 
          WHEN NEW.conversation_id IS NOT NULL THEN 'chat_conversation'
          ELSE 'chat_space'
        END,
        COALESCE(NEW.conversation_id, NEW.space_id),
        NEW.sender_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;