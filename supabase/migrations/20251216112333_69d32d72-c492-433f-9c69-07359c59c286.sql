-- Update notify_post_reaction function to handle both updates AND kudos reactions
CREATE OR REPLACE FUNCTION public.notify_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_owner_user_id UUID;
  target_owner_employee_id UUID;
  reactor_name TEXT;
  target_type_name TEXT;
BEGIN
  -- Handle updates
  IF NEW.target_type = 'update' THEN
    SELECT u.employee_id, e.user_id, 
      CASE u.type 
        WHEN 'win' THEN 'win'
        WHEN 'achievement' THEN 'achievement'
        ELSE 'post'
      END
    INTO target_owner_employee_id, target_owner_user_id, target_type_name
    FROM updates u
    JOIN employees e ON e.id = u.employee_id
    WHERE u.id = NEW.target_id;
    
  -- Handle kudos (notify the kudos recipient)
  ELSIF NEW.target_type = 'kudos' THEN
    SELECT k.employee_id, e.user_id
    INTO target_owner_employee_id, target_owner_user_id
    FROM kudos k
    JOIN employees e ON e.id = k.employee_id
    WHERE k.id = NEW.target_id;
    target_type_name := 'kudos you received';
  END IF;

  -- Create notification if target owner exists and reactor is not the owner
  IF target_owner_user_id IS NOT NULL AND NEW.employee_id != target_owner_employee_id THEN
    -- Get reactor's name
    SELECT p.full_name INTO reactor_name
    FROM employees e
    JOIN profiles p ON p.id = e.user_id
    WHERE e.id = NEW.employee_id;

    INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
    VALUES (
      target_owner_user_id,
      NEW.organization_id,
      'reaction',
      'New reaction',
      reactor_name || ' reacted ' || NEW.emoji || ' to your ' || COALESCE(target_type_name, 'post'),
      NEW.target_type,
      NEW.target_id,
      NEW.employee_id
    );
  END IF;

  RETURN NEW;
END;
$function$;