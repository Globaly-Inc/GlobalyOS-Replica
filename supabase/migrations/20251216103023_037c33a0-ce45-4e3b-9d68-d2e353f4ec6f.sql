-- Fix multi-organization bug in can_view_update / can_view_kudos.
-- Previous implementation picked an arbitrary employee row (LIMIT 1) for a user,
-- which breaks when a user belongs to multiple organizations.

CREATE OR REPLACE FUNCTION public.can_view_update(_update_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _employee record;
  _update record;
BEGIN
  -- Super admin can view everything
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Load update first (source of truth for org)
  SELECT u.organization_id, u.access_scope, u.employee_id
  INTO _update
  FROM public.updates u
  WHERE u.id = _update_id;

  IF _update IS NULL THEN
    RETURN false;
  END IF;

  -- Get employee record for THIS org
  SELECT e.id, e.organization_id, e.office_id, e.department
  INTO _employee
  FROM public.employees e
  WHERE e.user_id = _user_id
    AND e.organization_id = _update.organization_id
  LIMIT 1;

  IF _employee IS NULL THEN
    RETURN false;
  END IF;

  -- Author can view
  IF _update.employee_id = _employee.id THEN
    RETURN true;
  END IF;

  -- Owner/Admin/HR can view everything in their org
  IF has_role(_user_id, 'owner') OR has_role(_user_id, 'admin') OR has_role(_user_id, 'hr') THEN
    RETURN true;
  END IF;

  -- Access scope checks
  CASE COALESCE(_update.access_scope, 'company')
    WHEN 'company' THEN
      RETURN true;
    WHEN 'offices' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.update_offices uo
        WHERE uo.update_id = _update_id
          AND uo.office_id = _employee.office_id
      );
    WHEN 'departments' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.update_departments ud
        WHERE ud.update_id = _update_id
          AND ud.department = _employee.department
      );
    WHEN 'projects' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.update_projects up
        JOIN public.employee_projects ep ON ep.project_id = up.project_id
        WHERE up.update_id = _update_id
          AND ep.employee_id = _employee.id
      );
    ELSE
      RETURN true;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_kudos(_kudos_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _employee record;
  _kudos record;
BEGIN
  -- Super admin can view everything
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Load kudos first (source of truth for org)
  SELECT k.organization_id, k.access_scope, k.employee_id, k.given_by_id
  INTO _kudos
  FROM public.kudos k
  WHERE k.id = _kudos_id;

  IF _kudos IS NULL THEN
    RETURN false;
  END IF;

  -- Get employee record for THIS org
  SELECT e.id, e.organization_id, e.office_id, e.department
  INTO _employee
  FROM public.employees e
  WHERE e.user_id = _user_id
    AND e.organization_id = _kudos.organization_id
  LIMIT 1;

  IF _employee IS NULL THEN
    RETURN false;
  END IF;

  -- Recipient or giver can view
  IF _kudos.employee_id = _employee.id OR _kudos.given_by_id = _employee.id THEN
    RETURN true;
  END IF;

  -- Owner/Admin/HR can view everything in their org
  IF has_role(_user_id, 'owner') OR has_role(_user_id, 'admin') OR has_role(_user_id, 'hr') THEN
    RETURN true;
  END IF;

  -- Access scope checks
  CASE COALESCE(_kudos.access_scope, 'company')
    WHEN 'company' THEN
      RETURN true;
    WHEN 'offices' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.kudos_offices ko
        WHERE ko.kudos_id = _kudos_id
          AND ko.office_id = _employee.office_id
      );
    WHEN 'departments' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.kudos_departments kd
        WHERE kd.kudos_id = _kudos_id
          AND kd.department = _employee.department
      );
    WHEN 'projects' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.kudos_projects kp
        JOIN public.employee_projects ep ON ep.project_id = kp.project_id
        WHERE kp.kudos_id = _kudos_id
          AND ep.employee_id = _employee.id
      );
    ELSE
      RETURN true;
  END CASE;
END;
$$;
