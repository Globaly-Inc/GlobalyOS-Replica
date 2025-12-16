-- Fix the trigger to only reference columns that exist on each table
CREATE OR REPLACE FUNCTION public.notify_targeted_kudos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  giver_name TEXT;
  recipient RECORD;
  _access_scope TEXT;
  _kudos_id UUID;
  _target_office_id UUID;
  _target_department TEXT;
  _target_project_id UUID;
BEGIN
  _kudos_id := NEW.kudos_id;
  IF _kudos_id IS NULL THEN RETURN NEW; END IF;
  
  SELECT access_scope INTO _access_scope FROM kudos WHERE id = _kudos_id;
  
  IF _access_scope IS NULL OR _access_scope = 'company' THEN
    RETURN NEW;
  END IF;
  
  -- Get target from the appropriate column based on table
  IF TG_TABLE_NAME = 'kudos_offices' THEN
    _target_office_id := NEW.office_id;
  ELSIF TG_TABLE_NAME = 'kudos_departments' THEN
    _target_department := NEW.department;
  ELSIF TG_TABLE_NAME = 'kudos_projects' THEN
    _target_project_id := NEW.project_id;
  END IF;
  
  SELECT p.full_name INTO giver_name
  FROM kudos k
  JOIN employees e ON e.id = k.given_by_id
  JOIN profiles p ON p.id = e.user_id
  WHERE k.id = _kudos_id;
  
  FOR recipient IN
    SELECT DISTINCT e.user_id, k.organization_id, k.given_by_id as giver_id
    FROM kudos k
    JOIN employees e ON e.organization_id = k.organization_id
    WHERE k.id = _kudos_id
      AND e.id != k.given_by_id
      AND e.id != k.employee_id
      AND e.status = 'active'
      AND (
        (TG_TABLE_NAME = 'kudos_offices' AND e.office_id = _target_office_id)
        OR (TG_TABLE_NAME = 'kudos_departments' AND e.department = _target_department)
        OR (TG_TABLE_NAME = 'kudos_projects' AND EXISTS (
          SELECT 1 FROM employee_projects ep WHERE ep.employee_id = e.id AND ep.project_id = _target_project_id
        ))
      )
  LOOP
    INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
    VALUES (
      recipient.user_id,
      recipient.organization_id,
      'kudos',
      'Kudos shared with your group',
      COALESCE(giver_name, 'Someone') || ' gave kudos visible to your group',
      'kudos',
      _kudos_id,
      recipient.giver_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;