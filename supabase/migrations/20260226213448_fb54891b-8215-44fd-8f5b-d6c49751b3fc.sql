
-- 1. Create task_folders table
CREATE TABLE public.task_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid NOT NULL REFERENCES public.task_spaces(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '📁',
  color text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add folder_id to task_lists
ALTER TABLE public.task_lists ADD COLUMN folder_id uuid REFERENCES public.task_folders(id) ON DELETE SET NULL;

-- 3. Create task_sharing_permissions table
CREATE TABLE public.task_sharing_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('space', 'folder', 'list')),
  entity_id uuid NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  team_id uuid,
  permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, employee_id)
);

-- 4. RLS on task_folders
ALTER TABLE public.task_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders in their org"
  ON public.task_folders FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can create folders in their org"
  ON public.task_folders FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update folders in their org"
  ON public.task_folders FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete folders in their org"
  ON public.task_folders FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- 5. RLS on task_sharing_permissions
ALTER TABLE public.task_sharing_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sharing in their org"
  ON public.task_sharing_permissions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage sharing in their org"
  ON public.task_sharing_permissions FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update sharing in their org"
  ON public.task_sharing_permissions FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete sharing in their org"
  ON public.task_sharing_permissions FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- 6. Enable realtime on task_folders
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_folders;

-- 7. Updated_at trigger for task_folders
CREATE TRIGGER update_task_folders_updated_at
  BEFORE UPDATE ON public.task_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Indexes
CREATE INDEX idx_task_folders_space_id ON public.task_folders(space_id);
CREATE INDEX idx_task_folders_organization_id ON public.task_folders(organization_id);
CREATE INDEX idx_task_lists_folder_id ON public.task_lists(folder_id);
CREATE INDEX idx_task_sharing_permissions_entity ON public.task_sharing_permissions(entity_type, entity_id);
