-- Create SECURITY DEFINER function for soft deleting comments
-- This bypasses RLS issues by handling permission checks internally

CREATE OR REPLACE FUNCTION public.soft_delete_comment(_comment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _comment_employee_id uuid;
  _comment_org_id uuid;
  _current_employee_id uuid;
BEGIN
  -- Get comment details
  SELECT employee_id, organization_id INTO _comment_employee_id, _comment_org_id
  FROM post_comments
  WHERE id = _comment_id AND is_deleted = false;
  
  IF _comment_employee_id IS NULL THEN
    RETURN false; -- Comment not found or already deleted
  END IF;
  
  -- Get current employee in the same org
  SELECT id INTO _current_employee_id
  FROM employees
  WHERE user_id = auth.uid() AND organization_id = _comment_org_id;
  
  IF _current_employee_id IS NULL THEN
    RETURN false; -- User not in this org
  END IF;
  
  -- Check ownership OR admin/HR/owner role
  IF _comment_employee_id = _current_employee_id 
     OR has_role(auth.uid(), 'owner'::app_role)
     OR has_role(auth.uid(), 'admin'::app_role) 
     OR has_role(auth.uid(), 'hr'::app_role) THEN
    
    UPDATE post_comments 
    SET is_deleted = true, updated_at = now()
    WHERE id = _comment_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;