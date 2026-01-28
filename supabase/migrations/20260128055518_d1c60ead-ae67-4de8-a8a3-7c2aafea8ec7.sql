-- Function: Handle project assignment changes for project-scoped auto-sync spaces
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: Add employee to project-scoped auto-sync spaces
  IF TG_OP = 'INSERT' THEN
    INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
    SELECT cs.id, NEW.employee_id, cs.organization_id, 'member'
    FROM chat_spaces cs
    JOIN chat_space_projects csp ON csp.space_id = cs.id
    WHERE cs.organization_id = NEW.organization_id
      AND cs.access_scope = 'projects'
      AND cs.auto_sync_members = true
      AND cs.archived_at IS NULL
      AND csp.project_id = NEW.project_id
      AND NOT EXISTS (
        SELECT 1 FROM chat_space_members csm 
        WHERE csm.space_id = cs.id AND csm.employee_id = NEW.employee_id
      );
  END IF;

  -- On DELETE: Remove employee from project-scoped auto-sync spaces (if not in other matching projects)
  IF TG_OP = 'DELETE' THEN
    DELETE FROM chat_space_members csm
    WHERE csm.employee_id = OLD.employee_id
      AND csm.space_id IN (
        SELECT cs.id FROM chat_spaces cs
        JOIN chat_space_projects csp ON csp.space_id = cs.id
        WHERE cs.organization_id = OLD.organization_id
          AND cs.access_scope = 'projects'
          AND cs.auto_sync_members = true
          AND csp.project_id = OLD.project_id
      )
      -- Only remove if not still assigned via another project in the same space
      AND NOT EXISTS (
        SELECT 1 FROM employee_projects ep2
        JOIN chat_space_projects csp2 ON csp2.project_id = ep2.project_id
        WHERE ep2.employee_id = OLD.employee_id
          AND ep2.project_id != OLD.project_id
          AND csp2.space_id = csm.space_id
      );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for project assignment changes
DROP TRIGGER IF EXISTS trigger_sync_project_space_members ON employee_projects;
CREATE TRIGGER trigger_sync_project_space_members
  AFTER INSERT OR DELETE ON employee_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_space_members();