
-- Add access_scope and created_by columns to task entities
ALTER TABLE public.task_spaces
  ADD COLUMN IF NOT EXISTS access_scope text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.employees(id);

ALTER TABLE public.task_folders
  ADD COLUMN IF NOT EXISTS access_scope text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.employees(id);

ALTER TABLE public.task_lists
  ADD COLUMN IF NOT EXISTS access_scope text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.employees(id);

-- Junction table: task entity <-> offices
CREATE TABLE IF NOT EXISTS public.task_entity_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('space', 'folder', 'list')),
  entity_id uuid NOT NULL,
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_entity_offices_lookup ON public.task_entity_offices(entity_type, entity_id);
ALTER TABLE public.task_entity_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task entity offices in their org"
  ON public.task_entity_offices FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage task entity offices in their org"
  ON public.task_entity_offices FOR ALL
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Junction table: task entity <-> departments
CREATE TABLE IF NOT EXISTS public.task_entity_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('space', 'folder', 'list')),
  entity_id uuid NOT NULL,
  department text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_entity_departments_lookup ON public.task_entity_departments(entity_type, entity_id);
ALTER TABLE public.task_entity_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task entity departments in their org"
  ON public.task_entity_departments FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage task entity departments in their org"
  ON public.task_entity_departments FOR ALL
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Junction table: task entity <-> projects
CREATE TABLE IF NOT EXISTS public.task_entity_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('space', 'folder', 'list')),
  entity_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_entity_projects_lookup ON public.task_entity_projects(entity_type, entity_id);
ALTER TABLE public.task_entity_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task entity projects in their org"
  ON public.task_entity_projects FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage task entity projects in their org"
  ON public.task_entity_projects FOR ALL
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Add permission_level column to task_sharing_permissions if not present
-- Already has: entity_type, entity_id, employee_id, team_id, permission_level, organization_id

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_entity_offices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_entity_departments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_entity_projects;
