-- Create org-scoped function to get current employee ID (VOLATILE for RLS compatibility)
CREATE OR REPLACE FUNCTION public.get_current_employee_id_for_org(_org_id uuid)
RETURNS uuid
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.employees 
  WHERE user_id = auth.uid() 
    AND organization_id = _org_id 
    AND status = 'active'
  LIMIT 1
$$;

-- Create trigger function to set created_by on wiki_folders insert
CREATE OR REPLACE FUNCTION public.set_wiki_folder_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _employee_id uuid;
BEGIN
  -- Get employee ID for the current user in this organization
  _employee_id := get_current_employee_id_for_org(NEW.organization_id);
  
  IF _employee_id IS NULL THEN
    RAISE EXCEPTION 'No active employee record found for your user in this organization';
  END IF;
  
  -- Set created_by server-side (override any client-provided value)
  NEW.created_by := _employee_id;
  RETURN NEW;
END;
$$;

-- Create trigger function to set created_by on wiki_pages insert
CREATE OR REPLACE FUNCTION public.set_wiki_page_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _employee_id uuid;
BEGIN
  -- Get employee ID for the current user in this organization
  _employee_id := get_current_employee_id_for_org(NEW.organization_id);
  
  IF _employee_id IS NULL THEN
    RAISE EXCEPTION 'No active employee record found for your user in this organization';
  END IF;
  
  -- Set created_by server-side (override any client-provided value)
  NEW.created_by := _employee_id;
  RETURN NEW;
END;
$$;

-- Create BEFORE INSERT trigger on wiki_folders
DROP TRIGGER IF EXISTS set_wiki_folder_created_by_trigger ON wiki_folders;
CREATE TRIGGER set_wiki_folder_created_by_trigger
  BEFORE INSERT ON wiki_folders
  FOR EACH ROW
  EXECUTE FUNCTION set_wiki_folder_created_by();

-- Create BEFORE INSERT trigger on wiki_pages
DROP TRIGGER IF EXISTS set_wiki_page_created_by_trigger ON wiki_pages;
CREATE TRIGGER set_wiki_page_created_by_trigger
  BEFORE INSERT ON wiki_pages
  FOR EACH ROW
  EXECUTE FUNCTION set_wiki_page_created_by();

-- Update RLS policies for wiki_folders to use org-scoped function
DROP POLICY IF EXISTS "Users can insert wiki folders in their organization" ON wiki_folders;
CREATE POLICY "Users can insert wiki folders in their organization"
  ON wiki_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_org_member(auth.uid(), organization_id)
    AND created_by = get_current_employee_id_for_org(organization_id)
  );

-- Update RLS policies for wiki_pages to use org-scoped function
DROP POLICY IF EXISTS "Users can insert wiki pages in their organization" ON wiki_pages;
CREATE POLICY "Users can insert wiki pages in their organization"
  ON wiki_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_org_member(auth.uid(), organization_id)
    AND created_by = get_current_employee_id_for_org(organization_id)
  );