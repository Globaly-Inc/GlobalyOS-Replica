-- Create workflow_task_statuses table
CREATE TABLE public.workflow_task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_status TEXT NOT NULL CHECK (parent_status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create workflow_task_categories table
CREATE TABLE public.workflow_task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📋',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_workflow_task_statuses_template ON public.workflow_task_statuses(template_id);
CREATE INDEX idx_workflow_task_categories_template ON public.workflow_task_categories(template_id);

-- Enable RLS
ALTER TABLE public.workflow_task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_task_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_task_statuses
CREATE POLICY "Users can view workflow task statuses in their org"
  ON public.workflow_task_statuses FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert workflow task statuses in their org"
  ON public.workflow_task_statuses FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update workflow task statuses in their org"
  ON public.workflow_task_statuses FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete workflow task statuses in their org"
  ON public.workflow_task_statuses FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- RLS policies for workflow_task_categories
CREATE POLICY "Users can view workflow task categories in their org"
  ON public.workflow_task_categories FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert workflow task categories in their org"
  ON public.workflow_task_categories FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update workflow task categories in their org"
  ON public.workflow_task_categories FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete workflow task categories in their org"
  ON public.workflow_task_categories FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Function to seed default statuses and categories for a template
CREATE OR REPLACE FUNCTION public.seed_workflow_task_defaults(
  p_template_id UUID,
  p_organization_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed default statuses
  INSERT INTO workflow_task_statuses (template_id, organization_id, name, parent_status, sort_order, is_default)
  VALUES
    (p_template_id, p_organization_id, 'Pending', 'not_started', 0, true),
    (p_template_id, p_organization_id, 'Backlog', 'not_started', 1, true),
    (p_template_id, p_organization_id, 'In Progress', 'in_progress', 0, true),
    (p_template_id, p_organization_id, 'In Review', 'in_progress', 1, true),
    (p_template_id, p_organization_id, 'Waiting', 'in_progress', 2, true),
    (p_template_id, p_organization_id, 'Completed', 'completed', 0, true),
    (p_template_id, p_organization_id, 'Verified', 'completed', 1, true),
    (p_template_id, p_organization_id, 'Skipped', 'on_hold', 0, true),
    (p_template_id, p_organization_id, 'Blocked', 'on_hold', 1, true),
    (p_template_id, p_organization_id, 'Deferred', 'on_hold', 2, true);

  -- Seed default categories
  INSERT INTO workflow_task_categories (template_id, organization_id, name, emoji, sort_order, is_default)
  VALUES
    (p_template_id, p_organization_id, 'Documentation', '📄', 0, true),
    (p_template_id, p_organization_id, 'Equipment', '🖥️', 1, true),
    (p_template_id, p_organization_id, 'Training', '📚', 2, true),
    (p_template_id, p_organization_id, 'Access & Permissions', '🔑', 3, true),
    (p_template_id, p_organization_id, 'Exit Interview', '💬', 4, true),
    (p_template_id, p_organization_id, 'Asset Return', '📦', 5, true),
    (p_template_id, p_organization_id, 'Knowledge Transfer', '🧠', 6, true),
    (p_template_id, p_organization_id, 'Other', '📋', 7, true);
END;
$$;