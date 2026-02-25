
-- Update seed function: Blocked after In Progress (sort_order 2), In Review becomes 3, Completed becomes 4
CREATE OR REPLACE FUNCTION public.seed_task_space_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_statuses (organization_id, space_id, name, color, status_group, sort_order, is_default, is_closed) VALUES
    (NEW.organization_id, NEW.id, 'To Do',        '#6b7280', 'todo',        0, true,  false),
    (NEW.organization_id, NEW.id, 'In Progress',   '#3b82f6', 'in_progress', 1, false, false),
    (NEW.organization_id, NEW.id, 'Blocked',       '#ef4444', 'blocked',     2, false, false),
    (NEW.organization_id, NEW.id, 'In Review',     '#f59e0b', 'in_review',   3, false, false),
    (NEW.organization_id, NEW.id, 'Completed',     '#10b981', 'completed',   4, false, true);

  INSERT INTO public.task_categories (organization_id, space_id, name, icon, color, sort_order) VALUES
    (NEW.organization_id, NEW.id, 'Email',     'mail',       '#3b82f6', 0),
    (NEW.organization_id, NEW.id, 'Call',       'phone',      '#10b981', 1),
    (NEW.organization_id, NEW.id, 'Call Back',  'phone-call', '#f59e0b', 2),
    (NEW.organization_id, NEW.id, 'Reminder',   'bell',       '#8b5cf6', 3);

  RETURN NEW;
END;
$$;

-- Update sort_order for existing statuses to reflect new order
UPDATE public.task_statuses SET sort_order = 2 WHERE status_group = 'blocked';
UPDATE public.task_statuses SET sort_order = 3 WHERE status_group = 'in_review';
UPDATE public.task_statuses SET sort_order = 4 WHERE status_group = 'completed';
