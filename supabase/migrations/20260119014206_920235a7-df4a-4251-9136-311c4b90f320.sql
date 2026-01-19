-- Fix the handle_new_hire_onboarding function to call create_workflow_from_template with correct parameter order
-- The function signature is: create_workflow_from_template(p_employee_id uuid, p_organization_id uuid, p_target_date date, p_workflow_type text, p_created_by uuid default null)

CREATE OR REPLACE FUNCTION public.handle_new_hire_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger for new active employees marked as new hires
  IF NEW.status = 'active' AND NEW.is_new_hire = TRUE THEN
    -- Create onboarding workflow with CORRECT parameter order: (employee_id, org_id, target_date, workflow_type, created_by)
    PERFORM create_workflow_from_template(
      NEW.id,                    -- p_employee_id
      NEW.organization_id,       -- p_organization_id
      NEW.join_date::date,       -- p_target_date
      'onboarding',              -- p_workflow_type
      NULL                       -- p_created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;