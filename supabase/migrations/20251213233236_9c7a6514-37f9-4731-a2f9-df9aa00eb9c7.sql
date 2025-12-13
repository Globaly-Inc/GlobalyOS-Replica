-- Add file metadata columns to wiki_pages
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS is_file BOOLEAN DEFAULT false;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add sharing permissions columns to wiki_folders
ALTER TABLE wiki_folders ADD COLUMN IF NOT EXISTS access_scope TEXT DEFAULT 'company';
ALTER TABLE wiki_folders ADD COLUMN IF NOT EXISTS permission_level TEXT DEFAULT 'view';

-- Add sharing permissions columns to wiki_pages
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS access_scope TEXT DEFAULT 'company';
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS permission_level TEXT DEFAULT 'view';
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS inherit_from_folder BOOLEAN DEFAULT true;

-- Junction table for folder office-based access
CREATE TABLE IF NOT EXISTS wiki_folder_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES wiki_folders(id) ON DELETE CASCADE NOT NULL,
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(folder_id, office_id)
);

-- Junction table for page office-based access
CREATE TABLE IF NOT EXISTS wiki_page_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE NOT NULL,
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, office_id)
);

-- Junction table for folder department-based access
CREATE TABLE IF NOT EXISTS wiki_folder_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES wiki_folders(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(folder_id, department, organization_id)
);

-- Junction table for page department-based access
CREATE TABLE IF NOT EXISTS wiki_page_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, department, organization_id)
);

-- Junction table for folder project-based access
CREATE TABLE IF NOT EXISTS wiki_folder_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES wiki_folders(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(folder_id, project_id)
);

-- Junction table for page project-based access
CREATE TABLE IF NOT EXISTS wiki_page_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, project_id)
);

-- Junction table for folder member-based access
CREATE TABLE IF NOT EXISTS wiki_folder_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES wiki_folders(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'view',
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(folder_id, employee_id)
);

-- Junction table for page member-based access
CREATE TABLE IF NOT EXISTS wiki_page_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'view',
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, employee_id)
);

-- Enable RLS on all new tables
ALTER TABLE wiki_folder_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_folder_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_folder_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_folder_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for wiki_folder_offices
CREATE POLICY "Org members can view folder offices" ON wiki_folder_offices
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage folder offices" ON wiki_folder_offices
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for wiki_page_offices
CREATE POLICY "Org members can view page offices" ON wiki_page_offices
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage page offices" ON wiki_page_offices
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for wiki_folder_departments
CREATE POLICY "Org members can view folder departments" ON wiki_folder_departments
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage folder departments" ON wiki_folder_departments
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for wiki_page_departments
CREATE POLICY "Org members can view page departments" ON wiki_page_departments
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage page departments" ON wiki_page_departments
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for wiki_folder_projects
CREATE POLICY "Org members can view folder projects" ON wiki_folder_projects
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage folder projects" ON wiki_folder_projects
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for wiki_page_projects
CREATE POLICY "Org members can view page projects" ON wiki_page_projects
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage page projects" ON wiki_page_projects
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for wiki_folder_members
CREATE POLICY "Org members can view folder members" ON wiki_folder_members
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage folder members" ON wiki_folder_members
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for wiki_page_members
CREATE POLICY "Org members can view page members" ON wiki_page_members
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage page members" ON wiki_page_members
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));