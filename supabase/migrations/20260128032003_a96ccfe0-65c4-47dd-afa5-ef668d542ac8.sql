-- Add auto_sync_members column to chat_spaces
ALTER TABLE chat_spaces 
ADD COLUMN IF NOT EXISTS auto_sync_members boolean DEFAULT false;

COMMENT ON COLUMN chat_spaces.auto_sync_members IS 
  'When true, space membership automatically syncs with access scope changes (company employees, office transfers, project assignments)';

-- Function: Handle employee status changes for company-wide auto-sync spaces
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Employee became active: add to all company-wide auto-sync spaces
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
    SELECT cs.id, NEW.id, cs.organization_id, 'member'
    FROM chat_spaces cs
    WHERE cs.organization_id = NEW.organization_id
      AND cs.access_scope = 'company'
      AND cs.auto_sync_members = true
      AND cs.archived_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM chat_space_members csm 
        WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
      );
  END IF;

  -- Employee became inactive: remove from all auto-sync spaces
  IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
    DELETE FROM chat_space_members
    WHERE employee_id = NEW.id
      AND space_id IN (
        SELECT id FROM chat_spaces 
        WHERE organization_id = NEW.organization_id
          AND auto_sync_members = true
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Handle employee office changes for office-wise auto-sync spaces
CREATE OR REPLACE FUNCTION sync_office_space_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if office_id changed and employee is active
  IF NEW.status = 'active' AND (OLD.office_id IS DISTINCT FROM NEW.office_id) THEN
    -- Remove from old office spaces (if had old office)
    IF OLD.office_id IS NOT NULL THEN
      DELETE FROM chat_space_members csm
      WHERE csm.employee_id = NEW.id
        AND csm.space_id IN (
          SELECT cs.id FROM chat_spaces cs
          JOIN chat_space_offices cso ON cso.space_id = cs.id
          WHERE cs.organization_id = NEW.organization_id
            AND cs.access_scope = 'offices'
            AND cs.auto_sync_members = true
            AND cs.archived_at IS NULL
            AND cso.office_id = OLD.office_id
        );
    END IF;

    -- Add to new office spaces (if has new office)
    IF NEW.office_id IS NOT NULL THEN
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
      SELECT cs.id, NEW.id, cs.organization_id, 'member'
      FROM chat_spaces cs
      JOIN chat_space_offices cso ON cso.space_id = cs.id
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'offices'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND cso.office_id = NEW.office_id
        AND NOT EXISTS (
          SELECT 1 FROM chat_space_members csm2 
          WHERE csm2.space_id = cs.id AND csm2.employee_id = NEW.id
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_sync_company_space_members ON employees;
CREATE TRIGGER trigger_sync_company_space_members
  AFTER INSERT OR UPDATE OF status ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_space_members();

DROP TRIGGER IF EXISTS trigger_sync_office_space_members ON employees;
CREATE TRIGGER trigger_sync_office_space_members
  AFTER UPDATE OF office_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_office_space_members();