-- Function: Remove employee from all chat when made inactive
CREATE OR REPLACE FUNCTION remove_inactive_from_all_chat()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes from active to inactive
  IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
    
    -- 1. Remove from all chat conversations (group chats)
    DELETE FROM chat_participants
    WHERE employee_id = NEW.id
      AND organization_id = NEW.organization_id;
    
    -- 2. Remove from all chat spaces (including non-auto-sync spaces)
    DELETE FROM chat_space_members
    WHERE employee_id = NEW.id
      AND organization_id = NEW.organization_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_remove_inactive_from_all_chat ON employees;
CREATE TRIGGER trigger_remove_inactive_from_all_chat
  AFTER UPDATE OF status ON employees
  FOR EACH ROW
  EXECUTE FUNCTION remove_inactive_from_all_chat();

-- One-time cleanup: Remove inactive employees from chat conversations (groups)
DELETE FROM chat_participants cp
USING employees e
WHERE cp.employee_id = e.id
  AND e.status = 'inactive';

-- One-time cleanup: Remove inactive employees from chat spaces
DELETE FROM chat_space_members csm
USING employees e
WHERE csm.employee_id = e.id
  AND e.status = 'inactive';