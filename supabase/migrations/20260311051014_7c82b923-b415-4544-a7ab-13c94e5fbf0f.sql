
-- Update the auto_add_space_creator_as_admin trigger function to set source = 'space_creation'
CREATE OR REPLACE FUNCTION auto_add_space_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_space_members (space_id, employee_id, organization_id, role, source)
  VALUES (NEW.id, NEW.created_by, NEW.organization_id, 'admin', 'space_creation');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
