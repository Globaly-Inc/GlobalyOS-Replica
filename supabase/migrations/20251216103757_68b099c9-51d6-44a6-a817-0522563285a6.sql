-- FIX 1: Add RLS policy for employees table to allow org members to view basic employee info
-- This is needed for feed/profile display - sensitive columns are still protected by column-level access in app

CREATE POLICY "Org members can view employees in same org"
ON public.employees
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees viewer
    WHERE viewer.user_id = auth.uid()
    AND viewer.organization_id = employees.organization_id
  )
);

-- FIX 2: Create function and trigger for company-wide post notifications
CREATE OR REPLACE FUNCTION public.notify_company_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _author_name text;
  _employee record;
BEGIN
  -- Only trigger for company-wide posts
  IF COALESCE(NEW.access_scope, 'company') != 'company' THEN
    RETURN NEW;
  END IF;

  -- Get author name
  SELECT p.full_name INTO _author_name
  FROM profiles p
  JOIN employees e ON e.user_id = p.id
  WHERE e.id = NEW.employee_id;

  -- Notify all employees in the organization except the author
  FOR _employee IN
    SELECT e.id, e.user_id
    FROM employees e
    WHERE e.organization_id = NEW.organization_id
    AND e.id != NEW.employee_id
    AND e.status = 'active'
  LOOP
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
      _employee.user_id,
      NEW.organization_id,
      'update',
      CASE NEW.type
        WHEN 'win' THEN 'New win shared!'
        WHEN 'achievement' THEN 'New achievement!'
        ELSE 'New announcement'
      END,
      _author_name || ' shared a ' || COALESCE(NEW.type, 'update'),
      'update',
      NEW.id,
      NEW.employee_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_update_company_notify ON public.updates;

CREATE TRIGGER on_update_company_notify
AFTER INSERT ON public.updates
FOR EACH ROW
EXECUTE FUNCTION notify_company_post();
