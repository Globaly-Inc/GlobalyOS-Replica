-- Create function to notify post owner when someone reacts to their post
CREATE OR REPLACE FUNCTION public.notify_post_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  post_owner_user_id UUID;
  post_owner_employee_id UUID;
  reactor_name TEXT;
  post_type TEXT;
BEGIN
  -- Get the post owner's employee_id and user_id
  SELECT u.employee_id, e.user_id INTO post_owner_employee_id, post_owner_user_id
  FROM updates u
  JOIN employees e ON e.id = u.employee_id
  WHERE u.id = NEW.target_id;

  -- Only create notification if target is an update (not kudos) and reactor is not the post owner
  IF post_owner_user_id IS NOT NULL AND NEW.employee_id != post_owner_employee_id THEN
    -- Get reactor's name
    SELECT p.full_name INTO reactor_name
    FROM employees e
    JOIN profiles p ON p.id = e.user_id
    WHERE e.id = NEW.employee_id;

    -- Get post type
    SELECT u.type INTO post_type
    FROM updates u
    WHERE u.id = NEW.target_id;

    -- Create notification for post owner
    INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
    VALUES (
      post_owner_user_id,
      NEW.organization_id,
      'reaction',
      'New reaction on your post',
      reactor_name || ' reacted ' || NEW.emoji || ' to your ' || COALESCE(post_type, 'post'),
      'update',
      NEW.target_id,
      NEW.employee_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for post reactions
DROP TRIGGER IF EXISTS on_reaction_notify_post_owner ON public.feed_reactions;
CREATE TRIGGER on_reaction_notify_post_owner
  AFTER INSERT ON public.feed_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_reaction();