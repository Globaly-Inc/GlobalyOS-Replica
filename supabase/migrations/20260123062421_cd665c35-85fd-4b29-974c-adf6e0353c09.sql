-- Function to detect circular references in manager hierarchy
CREATE OR REPLACE FUNCTION check_manager_circular_reference()
RETURNS TRIGGER AS $$
DECLARE
  current_manager_id UUID;
  visited_ids UUID[];
  max_depth INT := 50;
  depth INT := 0;
BEGIN
  -- If manager_id is NULL, no check needed
  IF NEW.manager_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Cannot be your own manager
  IF NEW.manager_id = NEW.id THEN
    RAISE EXCEPTION 'An employee cannot be their own manager';
  END IF;
  
  -- Walk up the manager chain to detect cycles
  current_manager_id := NEW.manager_id;
  visited_ids := ARRAY[NEW.id];
  
  WHILE current_manager_id IS NOT NULL AND depth < max_depth LOOP
    -- Check if we've seen this ID before (cycle detected)
    IF current_manager_id = ANY(visited_ids) THEN
      RAISE EXCEPTION 'Circular manager reference detected. This would create a reporting loop.';
    END IF;
    
    -- Add to visited and move up the chain
    visited_ids := array_append(visited_ids, current_manager_id);
    
    SELECT manager_id INTO current_manager_id
    FROM employees
    WHERE id = current_manager_id;
    
    depth := depth + 1;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to prevent circular manager references
DROP TRIGGER IF EXISTS prevent_circular_manager_reference ON employees;
CREATE TRIGGER prevent_circular_manager_reference
BEFORE INSERT OR UPDATE OF manager_id ON employees
FOR EACH ROW
EXECUTE FUNCTION check_manager_circular_reference();