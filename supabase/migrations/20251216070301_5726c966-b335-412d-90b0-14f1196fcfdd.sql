-- Add access_scope to updates table
ALTER TABLE updates ADD COLUMN IF NOT EXISTS access_scope text DEFAULT 'company';
ALTER TABLE updates ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add access_scope to kudos table
ALTER TABLE kudos ADD COLUMN IF NOT EXISTS access_scope text DEFAULT 'company';
ALTER TABLE kudos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create junction tables for updates visibility
CREATE TABLE IF NOT EXISTS update_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(update_id, office_id)
);

CREATE TABLE IF NOT EXISTS update_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  department text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(update_id, department)
);

CREATE TABLE IF NOT EXISTS update_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(update_id, project_id)
);

-- Create junction tables for kudos visibility
CREATE TABLE IF NOT EXISTS kudos_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kudos_id uuid NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(kudos_id, office_id)
);

CREATE TABLE IF NOT EXISTS kudos_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kudos_id uuid NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
  department text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(kudos_id, department)
);

CREATE TABLE IF NOT EXISTS kudos_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kudos_id uuid NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(kudos_id, project_id)
);

-- Enable RLS on all new tables
ALTER TABLE update_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_projects ENABLE ROW LEVEL SECURITY;

-- Create can_view_update function
CREATE OR REPLACE FUNCTION public.can_view_update(_update_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee record;
  _update record;
BEGIN
  SELECT e.id, e.organization_id, e.office_id, e.department
  INTO _employee
  FROM employees e WHERE e.user_id = _user_id LIMIT 1;
  
  IF _employee IS NULL THEN RETURN false; END IF;
  
  SELECT u.organization_id, u.access_scope, u.employee_id
  INTO _update FROM updates u WHERE u.id = _update_id;
  
  IF _update IS NULL THEN RETURN false; END IF;
  IF _employee.organization_id != _update.organization_id THEN RETURN false; END IF;
  
  IF _update.employee_id = _employee.id THEN RETURN true; END IF;
  
  IF has_role(_user_id, 'owner') OR has_role(_user_id, 'admin') OR has_role(_user_id, 'hr') THEN
    RETURN true;
  END IF;
  
  CASE COALESCE(_update.access_scope, 'company')
    WHEN 'company' THEN RETURN true;
    WHEN 'offices' THEN
      RETURN EXISTS (SELECT 1 FROM update_offices uo WHERE uo.update_id = _update_id AND uo.office_id = _employee.office_id);
    WHEN 'departments' THEN
      RETURN EXISTS (SELECT 1 FROM update_departments ud WHERE ud.update_id = _update_id AND ud.department = _employee.department);
    WHEN 'projects' THEN
      RETURN EXISTS (SELECT 1 FROM update_projects up 
        JOIN employee_projects ep ON ep.project_id = up.project_id 
        WHERE up.update_id = _update_id AND ep.employee_id = _employee.id);
    ELSE RETURN true;
  END CASE;
END;
$$;

-- Create can_view_kudos function
CREATE OR REPLACE FUNCTION public.can_view_kudos(_kudos_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee record;
  _kudos record;
BEGIN
  SELECT e.id, e.organization_id, e.office_id, e.department
  INTO _employee
  FROM employees e WHERE e.user_id = _user_id LIMIT 1;
  
  IF _employee IS NULL THEN RETURN false; END IF;
  
  SELECT k.organization_id, k.access_scope, k.employee_id, k.given_by_id
  INTO _kudos FROM kudos k WHERE k.id = _kudos_id;
  
  IF _kudos IS NULL THEN RETURN false; END IF;
  IF _employee.organization_id != _kudos.organization_id THEN RETURN false; END IF;
  
  IF _kudos.employee_id = _employee.id OR _kudos.given_by_id = _employee.id THEN RETURN true; END IF;
  
  IF has_role(_user_id, 'owner') OR has_role(_user_id, 'admin') OR has_role(_user_id, 'hr') THEN
    RETURN true;
  END IF;
  
  CASE COALESCE(_kudos.access_scope, 'company')
    WHEN 'company' THEN RETURN true;
    WHEN 'offices' THEN
      RETURN EXISTS (SELECT 1 FROM kudos_offices ko WHERE ko.kudos_id = _kudos_id AND ko.office_id = _employee.office_id);
    WHEN 'departments' THEN
      RETURN EXISTS (SELECT 1 FROM kudos_departments kd WHERE kd.kudos_id = _kudos_id AND kd.department = _employee.department);
    WHEN 'projects' THEN
      RETURN EXISTS (SELECT 1 FROM kudos_projects kp 
        JOIN employee_projects ep ON ep.project_id = kp.project_id 
        WHERE kp.kudos_id = _kudos_id AND ep.employee_id = _employee.id);
    ELSE RETURN true;
  END CASE;
END;
$$;

-- Update RLS policies for updates table
DROP POLICY IF EXISTS "Org members can view updates" ON updates;
CREATE POLICY "Users can view accessible updates" ON updates
FOR SELECT TO authenticated
USING (can_view_update(id));

-- Update RLS policies for kudos table
DROP POLICY IF EXISTS "Org members can view kudos" ON kudos;
CREATE POLICY "Users can view accessible kudos" ON kudos
FOR SELECT TO authenticated
USING (can_view_kudos(id));

-- RLS policies for update_offices
CREATE POLICY "Users can view update_offices in org" ON update_offices
FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Authors can manage update_offices" ON update_offices
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM updates u WHERE u.id = update_id AND u.employee_id = get_current_employee_id()))
WITH CHECK (EXISTS (SELECT 1 FROM updates u WHERE u.id = update_id AND u.employee_id = get_current_employee_id()));

-- RLS policies for update_departments
CREATE POLICY "Users can view update_departments in org" ON update_departments
FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Authors can manage update_departments" ON update_departments
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM updates u WHERE u.id = update_id AND u.employee_id = get_current_employee_id()))
WITH CHECK (EXISTS (SELECT 1 FROM updates u WHERE u.id = update_id AND u.employee_id = get_current_employee_id()));

-- RLS policies for update_projects
CREATE POLICY "Users can view update_projects in org" ON update_projects
FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Authors can manage update_projects" ON update_projects
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM updates u WHERE u.id = update_id AND u.employee_id = get_current_employee_id()))
WITH CHECK (EXISTS (SELECT 1 FROM updates u WHERE u.id = update_id AND u.employee_id = get_current_employee_id()));

-- RLS policies for kudos_offices
CREATE POLICY "Users can view kudos_offices in org" ON kudos_offices
FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Givers can manage kudos_offices" ON kudos_offices
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM kudos k WHERE k.id = kudos_id AND k.given_by_id = get_current_employee_id()))
WITH CHECK (EXISTS (SELECT 1 FROM kudos k WHERE k.id = kudos_id AND k.given_by_id = get_current_employee_id()));

-- RLS policies for kudos_departments
CREATE POLICY "Users can view kudos_departments in org" ON kudos_departments
FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Givers can manage kudos_departments" ON kudos_departments
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM kudos k WHERE k.id = kudos_id AND k.given_by_id = get_current_employee_id()))
WITH CHECK (EXISTS (SELECT 1 FROM kudos k WHERE k.id = kudos_id AND k.given_by_id = get_current_employee_id()));

-- RLS policies for kudos_projects
CREATE POLICY "Users can view kudos_projects in org" ON kudos_projects
FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Givers can manage kudos_projects" ON kudos_projects
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM kudos k WHERE k.id = kudos_id AND k.given_by_id = get_current_employee_id()))
WITH CHECK (EXISTS (SELECT 1 FROM kudos k WHERE k.id = kudos_id AND k.given_by_id = get_current_employee_id()));

-- Create notification function for targeted posts
CREATE OR REPLACE FUNCTION public.notify_targeted_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poster_name TEXT;
  post_type TEXT;
  recipient RECORD;
  _access_scope TEXT;
BEGIN
  SELECT access_scope INTO _access_scope FROM updates WHERE id = NEW.update_id;
  
  IF _access_scope IS NULL OR _access_scope = 'company' THEN
    RETURN NEW;
  END IF;
  
  SELECT p.full_name INTO poster_name
  FROM updates u
  JOIN employees e ON e.id = u.employee_id
  JOIN profiles p ON p.id = e.user_id
  WHERE u.id = NEW.update_id;
  
  SELECT CASE type WHEN 'update' THEN 'announcement' ELSE type END INTO post_type
  FROM updates WHERE id = NEW.update_id;
  
  FOR recipient IN
    SELECT DISTINCT e.user_id, u.organization_id, u.employee_id as author_id
    FROM updates u
    JOIN employees e ON e.organization_id = u.organization_id
    WHERE u.id = NEW.update_id
      AND e.id != u.employee_id
      AND e.status = 'active'
      AND (
        (_access_scope = 'offices' AND e.office_id = NEW.office_id)
        OR (_access_scope = 'departments' AND e.department = (SELECT department FROM update_departments WHERE id = NEW.id))
        OR (_access_scope = 'projects' AND EXISTS (
          SELECT 1 FROM employee_projects ep WHERE ep.employee_id = e.id AND ep.project_id = NEW.project_id
        ))
      )
  LOOP
    INSERT INTO notifications (user_id, organization_id, type, title, message, reference_type, reference_id, actor_id)
    VALUES (
      recipient.user_id,
      recipient.organization_id,
      'announcement',
      'New ' || COALESCE(post_type, 'post') || ' shared with your group',
      COALESCE(poster_name, 'Someone') || ' posted a ' || COALESCE(post_type, 'post'),
      'update',
      NEW.update_id,
      recipient.author_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create triggers for update visibility notifications
DROP TRIGGER IF EXISTS on_update_offices_notify ON update_offices;
CREATE TRIGGER on_update_offices_notify
AFTER INSERT ON update_offices
FOR EACH ROW
EXECUTE FUNCTION notify_targeted_post();

DROP TRIGGER IF EXISTS on_update_departments_notify ON update_departments;
CREATE TRIGGER on_update_departments_notify
AFTER INSERT ON update_departments
FOR EACH ROW
EXECUTE FUNCTION notify_targeted_post();

DROP TRIGGER IF EXISTS on_update_projects_notify ON update_projects;
CREATE TRIGGER on_update_projects_notify
AFTER INSERT ON update_projects
FOR EACH ROW
EXECUTE FUNCTION notify_targeted_post();

-- Create notification function for targeted kudos
CREATE OR REPLACE FUNCTION public.notify_targeted_kudos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  giver_name TEXT;
  recipient RECORD;
  _access_scope TEXT;
  _kudos_id UUID;
BEGIN
  _kudos_id := COALESCE(NEW.kudos_id, NULL);
  IF _kudos_id IS NULL THEN RETURN NEW; END IF;
  
  SELECT access_scope INTO _access_scope FROM kudos WHERE id = _kudos_id;
  
  IF _access_scope IS NULL OR _access_scope = 'company' THEN
    RETURN NEW;
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
        (_access_scope = 'offices' AND e.office_id = NEW.office_id)
        OR (_access_scope = 'departments' AND e.department = (SELECT department FROM kudos_departments WHERE id = NEW.id))
        OR (_access_scope = 'projects' AND EXISTS (
          SELECT 1 FROM employee_projects ep WHERE ep.employee_id = e.id AND ep.project_id = NEW.project_id
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
$$;

-- Create triggers for kudos visibility notifications
DROP TRIGGER IF EXISTS on_kudos_offices_notify ON kudos_offices;
CREATE TRIGGER on_kudos_offices_notify
AFTER INSERT ON kudos_offices
FOR EACH ROW
EXECUTE FUNCTION notify_targeted_kudos();

DROP TRIGGER IF EXISTS on_kudos_departments_notify ON kudos_departments;
CREATE TRIGGER on_kudos_departments_notify
AFTER INSERT ON kudos_departments
FOR EACH ROW
EXECUTE FUNCTION notify_targeted_kudos();

DROP TRIGGER IF EXISTS on_kudos_projects_notify ON kudos_projects;
CREATE TRIGGER on_kudos_projects_notify
AFTER INSERT ON kudos_projects
FOR EACH ROW
EXECUTE FUNCTION notify_targeted_kudos();