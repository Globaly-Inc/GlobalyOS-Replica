
-- Update the seed_task_space_defaults function to include "Blocked" status
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
    (NEW.organization_id, NEW.id, 'Blocked',       '#ef4444', 'blocked',     3, false, false),
    (NEW.organization_id, NEW.id, 'Completed',     '#10b981', 'completed',   4, false, true);

  -- Default categories
  INSERT INTO public.task_categories (organization_id, space_id, name, icon, color, sort_order) VALUES
    (NEW.organization_id, NEW.id, 'Email',     'mail',       '#3b82f6', 0),
    (NEW.organization_id, NEW.id, 'Call',       'phone',      '#10b981', 1),
    (NEW.organization_id, NEW.id, 'Call Back',  'phone-call', '#f59e0b', 2),
    (NEW.organization_id, NEW.id, 'Reminder',   'bell',       '#8b5cf6', 3);

  RETURN NEW;
END;
$$;
