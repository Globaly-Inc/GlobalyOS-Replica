-- Create a new function that gets current employee ID for a specific organization
CREATE OR REPLACE FUNCTION public.get_current_employee_id_for_org(_org_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees 
  WHERE user_id = auth.uid() 
  AND organization_id = _org_id 
  LIMIT 1
$$;

-- Update the chat_conversations INSERT policy to use org-aware check
DROP POLICY IF EXISTS "chat_conversations_insert" ON chat_conversations;

CREATE POLICY "chat_conversations_insert" ON chat_conversations
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND created_by = get_current_employee_id_for_org(organization_id)
);