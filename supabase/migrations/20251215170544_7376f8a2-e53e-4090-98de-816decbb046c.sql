-- Create a security definer function to transfer wiki item ownership
CREATE OR REPLACE FUNCTION public.transfer_wiki_ownership(
  _item_type TEXT,
  _item_id UUID,
  _new_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_owner_id UUID;
  _org_id UUID;
  _current_employee_id UUID;
BEGIN
  -- Get the current employee ID
  _current_employee_id := get_current_employee_id();
  
  IF _current_employee_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current owner and organization
  IF _item_type = 'folder' THEN
    SELECT created_by, organization_id INTO _current_owner_id, _org_id
    FROM wiki_folders
    WHERE id = _item_id;
  ELSIF _item_type = 'page' THEN
    SELECT created_by, organization_id INTO _current_owner_id, _org_id
    FROM wiki_pages
    WHERE id = _item_id;
  ELSE
    RAISE EXCEPTION 'Invalid item type: %', _item_type;
  END IF;
  
  IF _current_owner_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  
  -- Verify the current user is the owner
  IF _current_owner_id != _current_employee_id THEN
    -- Also allow admin/HR to transfer
    IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'owner')) THEN
      RAISE EXCEPTION 'Only the owner or admin can transfer ownership';
    END IF;
  END IF;
  
  -- Verify the new owner is in the same organization
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = _new_owner_id 
    AND organization_id = _org_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'New owner must be an active member of the same organization';
  END IF;
  
  -- Transfer ownership
  IF _item_type = 'folder' THEN
    UPDATE wiki_folders 
    SET created_by = _new_owner_id, updated_at = NOW()
    WHERE id = _item_id;
  ELSE
    UPDATE wiki_pages 
    SET created_by = _new_owner_id, updated_at = NOW()
    WHERE id = _item_id;
  END IF;
  
  RETURN TRUE;
END;
$$;