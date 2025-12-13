-- Create access scope enum
CREATE TYPE chat_space_access_scope AS ENUM ('company', 'offices', 'projects', 'members');

-- Add new columns to chat_spaces
ALTER TABLE chat_spaces ADD COLUMN icon_url TEXT;
ALTER TABLE chat_spaces ADD COLUMN access_scope chat_space_access_scope DEFAULT 'company';

-- Create junction table for office-based access
CREATE TABLE chat_space_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES chat_spaces(id) ON DELETE CASCADE NOT NULL,
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(space_id, office_id)
);

ALTER TABLE chat_space_offices ENABLE ROW LEVEL SECURITY;

-- Create junction table for project-based access
CREATE TABLE chat_space_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES chat_spaces(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(space_id, project_id)
);

ALTER TABLE chat_space_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_space_offices
CREATE POLICY "Org members can view space offices"
ON chat_space_offices FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Space admins can manage space offices"
ON chat_space_offices FOR ALL
USING (is_space_admin(space_id, get_current_employee_id_for_org(organization_id)))
WITH CHECK (is_space_admin(space_id, get_current_employee_id_for_org(organization_id)));

CREATE POLICY "Space creator can insert space offices"
ON chat_space_offices FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_spaces cs
    WHERE cs.id = space_id
    AND cs.created_by = get_current_employee_id_for_org(organization_id)
  )
);

-- RLS Policies for chat_space_projects
CREATE POLICY "Org members can view space projects"
ON chat_space_projects FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Space admins can manage space projects"
ON chat_space_projects FOR ALL
USING (is_space_admin(space_id, get_current_employee_id_for_org(organization_id)))
WITH CHECK (is_space_admin(space_id, get_current_employee_id_for_org(organization_id)));

CREATE POLICY "Space creator can insert space projects"
ON chat_space_projects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_spaces cs
    WHERE cs.id = space_id
    AND cs.created_by = get_current_employee_id_for_org(organization_id)
  )
);