-- Create a function to seed default workflow data for an organization
-- This will be called when the workflow settings are first accessed

CREATE OR REPLACE FUNCTION public.seed_default_workflow_data(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  onboarding_template_id UUID;
  offboarding_template_id UUID;
BEGIN
  -- Check if templates already exist for this org
  IF EXISTS (SELECT 1 FROM workflow_templates WHERE organization_id = org_id) THEN
    RETURN; -- Already seeded
  END IF;

  -- Create default onboarding template
  INSERT INTO workflow_templates (organization_id, name, type, description, is_default)
  VALUES (org_id, 'Default Onboarding', 'onboarding', 'Standard onboarding workflow for new hires', true)
  RETURNING id INTO onboarding_template_id;

  -- Create default offboarding template
  INSERT INTO workflow_templates (organization_id, name, type, description, is_default)
  VALUES (org_id, 'Default Offboarding', 'offboarding', 'Standard offboarding workflow for departing employees', true)
  RETURNING id INTO offboarding_template_id;

  -- Create default onboarding stages
  INSERT INTO workflow_stages (template_id, organization_id, name, description, sort_order, color) VALUES
    (onboarding_template_id, org_id, 'Pre-arrival', 'Tasks to complete before employee starts', 1, '#3B82F6'),
    (onboarding_template_id, org_id, 'First Day', 'Day one activities and introductions', 2, '#10B981'),
    (onboarding_template_id, org_id, 'First Week', 'Initial training and setup tasks', 3, '#F59E0B'),
    (onboarding_template_id, org_id, 'First Month', 'Ongoing integration and learning', 4, '#8B5CF6');

  -- Create default offboarding stages
  INSERT INTO workflow_stages (template_id, organization_id, name, description, sort_order, color) VALUES
    (offboarding_template_id, org_id, 'Notification Period', 'Initial offboarding tasks after resignation', 1, '#EF4444'),
    (offboarding_template_id, org_id, 'Knowledge Transfer', 'Documentation and handover activities', 2, '#F59E0B'),
    (offboarding_template_id, org_id, 'Asset Return', 'Equipment and access handover', 3, '#6366F1'),
    (offboarding_template_id, org_id, 'Final Week', 'Last week tasks and exit formalities', 4, '#EC4899');

  -- Create default triggers
  INSERT INTO workflow_triggers (organization_id, workflow_type, trigger_event, trigger_field, trigger_condition, trigger_value, is_enabled) VALUES
    (org_id, 'onboarding', 'employee_update', 'is_new_hire', 'equals', 'true', true),
    (org_id, 'offboarding', 'employee_update', 'last_working_day', 'is_not_null', NULL, true);

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.seed_default_workflow_data(UUID) TO authenticated;