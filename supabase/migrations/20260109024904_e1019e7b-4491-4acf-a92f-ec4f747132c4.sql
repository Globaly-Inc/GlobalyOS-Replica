-- =============================================
-- HR Workflow System: Stages, Triggers, and Realtime
-- =============================================

-- 1. Create workflow_stages table
CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, name)
);

-- 2. Create workflow_triggers table
CREATE TABLE IF NOT EXISTS public.workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_field TEXT NOT NULL,
  trigger_condition TEXT NOT NULL,
  trigger_value TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, workflow_type)
);

-- 3. Add stage_id to workflow_template_tasks
ALTER TABLE public.workflow_template_tasks 
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.workflow_stages(id) ON DELETE SET NULL;

-- 4. Add stage_id to employee_workflow_tasks
ALTER TABLE public.employee_workflow_tasks 
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.workflow_stages(id) ON DELETE SET NULL;

-- 5. Enable RLS on new tables
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for workflow_stages (using user_roles table)
CREATE POLICY "Users can view stages in their org" ON public.workflow_stages
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/HR can manage stages" ON public.workflow_stages
  FOR ALL USING (organization_id IN (
    SELECT ur.organization_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role IN ('owner', 'admin', 'hr')
  ));

-- 7. RLS policies for workflow_triggers (using user_roles table)
CREATE POLICY "Users can view triggers in their org" ON public.workflow_triggers
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/HR can manage triggers" ON public.workflow_triggers
  FOR ALL USING (organization_id IN (
    SELECT ur.organization_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role IN ('owner', 'admin', 'hr')
  ));

-- 8. Enable Realtime for workflow tables
ALTER TABLE public.employee_workflows REPLICA IDENTITY FULL;
ALTER TABLE public.employee_workflow_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.workflow_stages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'employee_workflows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_workflows;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'employee_workflow_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_workflow_tasks;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workflow_stages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_stages;
  END IF;
END $$;

-- 9. Insert default triggers for existing organizations (upsert pattern)
INSERT INTO public.workflow_triggers (organization_id, workflow_type, trigger_event, trigger_field, trigger_condition, trigger_value, is_enabled)
SELECT DISTINCT organization_id, 'onboarding', 'New hire activated', 'is_new_hire', 'equals', 'true', true
FROM public.workflow_templates WHERE type = 'onboarding'
ON CONFLICT (organization_id, workflow_type) DO NOTHING;

INSERT INTO public.workflow_triggers (organization_id, workflow_type, trigger_event, trigger_field, trigger_condition, trigger_value, is_enabled)
SELECT DISTINCT organization_id, 'offboarding', 'Last working day set', 'last_working_day', 'is_set', NULL, true
FROM public.workflow_templates WHERE type = 'offboarding'
ON CONFLICT (organization_id, workflow_type) DO NOTHING;

-- 10. Seed default stages for existing onboarding templates
INSERT INTO public.workflow_stages (template_id, organization_id, name, sort_order, color)
SELECT t.id, t.organization_id, s.name, s.sort_order, s.color
FROM public.workflow_templates t
CROSS JOIN (VALUES 
  ('Pre-arrival', 0, 'blue'),
  ('First Day', 1, 'green'),
  ('First Week', 2, 'yellow'),
  ('First Month', 3, 'purple')
) AS s(name, sort_order, color)
WHERE t.type = 'onboarding' AND t.is_default = true
ON CONFLICT (template_id, name) DO NOTHING;

-- 11. Seed default stages for existing offboarding templates
INSERT INTO public.workflow_stages (template_id, organization_id, name, sort_order, color)
SELECT t.id, t.organization_id, s.name, s.sort_order, s.color
FROM public.workflow_templates t
CROSS JOIN (VALUES 
  ('Notification Period', 0, 'blue'),
  ('Knowledge Transfer', 1, 'yellow'),
  ('Asset Return', 2, 'orange'),
  ('Final Week', 3, 'red')
) AS s(name, sort_order, color)
WHERE t.type = 'offboarding' AND t.is_default = true
ON CONFLICT (template_id, name) DO NOTHING;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_stages_template ON public.workflow_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_org ON public.workflow_stages(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_org ON public.workflow_triggers(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_workflow_tasks_stage ON public.employee_workflow_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_workflow_template_tasks_stage ON public.workflow_template_tasks(stage_id);

-- 13. Create updated_at trigger for new tables
CREATE OR REPLACE FUNCTION public.update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workflow_stages_updated_at ON public.workflow_stages;
CREATE TRIGGER update_workflow_stages_updated_at
  BEFORE UPDATE ON public.workflow_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_workflow_updated_at();

DROP TRIGGER IF EXISTS update_workflow_triggers_updated_at ON public.workflow_triggers;
CREATE TRIGGER update_workflow_triggers_updated_at
  BEFORE UPDATE ON public.workflow_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_workflow_updated_at();