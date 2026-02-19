-- Create task_lists table: one space can hold many lists
CREATE TABLE public.task_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.task_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_lists: org members can view"
  ON public.task_lists FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "task_lists: org members can insert"
  ON public.task_lists FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "task_lists: org members can update"
  ON public.task_lists FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "task_lists: org members can delete"
  ON public.task_lists FOR DELETE
  USING (is_org_member(auth.uid(), organization_id));

-- Add list_id column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES public.task_lists(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_lists_space_id ON public.task_lists(space_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON public.tasks(list_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_task_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER task_lists_updated_at
  BEFORE UPDATE ON public.task_lists
  FOR EACH ROW EXECUTE FUNCTION update_task_lists_updated_at();

-- Migrate: create "Main" list for each existing space
INSERT INTO public.task_lists (organization_id, space_id, name, sort_order)
SELECT s.organization_id, s.id, 'Main', 0
FROM public.task_spaces s;

-- Assign all existing tasks to their space's Main list
UPDATE public.tasks t
SET list_id = tl.id
FROM public.task_lists tl
WHERE tl.space_id = t.space_id AND t.list_id IS NULL;
