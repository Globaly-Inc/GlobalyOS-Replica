
-- =====================================================
-- Task Management Module: Phase 1 Migration
-- 9 tables + RLS + auto-seed trigger + storage bucket
-- =====================================================

-- 1. task_spaces
CREATE TABLE public.task_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.task_spaces(id) ON DELETE SET NULL,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6366f1',
  owner_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_spaces_org ON public.task_spaces(organization_id);
CREATE INDEX idx_task_spaces_parent ON public.task_spaces(parent_id);
ALTER TABLE public.task_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task spaces" ON public.task_spaces FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create task spaces" ON public.task_spaces FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update task spaces" ON public.task_spaces FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can delete task spaces" ON public.task_spaces FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- 2. task_statuses
CREATE TABLE public.task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.task_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  status_group TEXT NOT NULL DEFAULT 'todo',
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_closed BOOLEAN DEFAULT false
);
CREATE INDEX idx_task_statuses_space ON public.task_statuses(space_id);
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task statuses" ON public.task_statuses FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create task statuses" ON public.task_statuses FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update task statuses" ON public.task_statuses FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can delete task statuses" ON public.task_statuses FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- 3. task_categories
CREATE TABLE public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.task_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'tag',
  color TEXT DEFAULT '#6b7280',
  sort_order INT DEFAULT 0
);
CREATE INDEX idx_task_categories_space ON public.task_categories(space_id);
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task categories" ON public.task_categories FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create task categories" ON public.task_categories FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update task categories" ON public.task_categories FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can delete task categories" ON public.task_categories FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- 4. tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.task_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  due_date DATE,
  start_date DATE,
  tags TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  related_entity_type TEXT,
  related_entity_id UUID,
  notification_enabled BOOLEAN DEFAULT true,
  recurrence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX idx_tasks_space ON public.tasks(space_id);
CREATE INDEX idx_tasks_status ON public.tasks(status_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tasks" ON public.tasks FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- 5. task_checklists
CREATE TABLE public.task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN DEFAULT false,
  assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  due_date DATE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_checklists_task ON public.task_checklists(task_id);
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task checklists" ON public.task_checklists FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create task checklists" ON public.task_checklists FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update task checklists" ON public.task_checklists FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can delete task checklists" ON public.task_checklists FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- 6. task_comments
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task comments" ON public.task_comments FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create task comments" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update own task comments" ON public.task_comments FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND employee_id = get_current_employee_id());
CREATE POLICY "Org members can delete own task comments" ON public.task_comments FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND employee_id = get_current_employee_id());

-- 7. task_attachments
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task attachments" ON public.task_attachments FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create task attachments" ON public.task_attachments FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can delete task attachments" ON public.task_attachments FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- 8. task_followers
CREATE TABLE public.task_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, employee_id)
);
CREATE INDEX idx_task_followers_task ON public.task_followers(task_id);
ALTER TABLE public.task_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task followers" ON public.task_followers FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can add task followers" ON public.task_followers FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can remove task followers" ON public.task_followers FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- 9. task_activity_logs
CREATE TABLE public.task_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_activity_logs_task ON public.task_activity_logs(task_id);
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task activity logs" ON public.task_activity_logs FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create task activity logs" ON public.task_activity_logs FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));

-- =====================================================
-- Auto-seed trigger: when a space is created, insert default statuses and categories
-- =====================================================
CREATE OR REPLACE FUNCTION public.seed_task_space_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default statuses
  INSERT INTO public.task_statuses (organization_id, space_id, name, color, status_group, sort_order, is_default, is_closed) VALUES
    (NEW.organization_id, NEW.id, 'To Do',        '#6b7280', 'todo',        0, true,  false),
    (NEW.organization_id, NEW.id, 'In Progress',   '#3b82f6', 'in_progress', 1, false, false),
    (NEW.organization_id, NEW.id, 'In Review',     '#f59e0b', 'in_review',   2, false, false),
    (NEW.organization_id, NEW.id, 'Completed',     '#10b981', 'completed',   3, false, true);

  -- Default categories
  INSERT INTO public.task_categories (organization_id, space_id, name, icon, color, sort_order) VALUES
    (NEW.organization_id, NEW.id, 'Email',     'mail',       '#3b82f6', 0),
    (NEW.organization_id, NEW.id, 'Call',       'phone',      '#10b981', 1),
    (NEW.organization_id, NEW.id, 'Call Back',  'phone-call', '#f59e0b', 2),
    (NEW.organization_id, NEW.id, 'Reminder',   'bell',       '#8b5cf6', 3);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_seed_task_space_defaults
  AFTER INSERT ON public.task_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_task_space_defaults();

-- =====================================================
-- Updated_at trigger for tasks
-- =====================================================
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_spaces_updated_at
  BEFORE UPDATE ON public.task_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Storage bucket for task attachments
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members can upload task attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Org members can view task attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "Org members can delete task attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments');

-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activity_logs;
