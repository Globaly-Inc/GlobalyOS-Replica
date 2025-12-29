-- Add project_lead_id and secondary_lead_id to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_lead_id UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS secondary_lead_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_project_lead_id ON projects(project_lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_secondary_lead_id ON projects(secondary_lead_id);

-- Add projects_enabled to ai_knowledge_settings table
ALTER TABLE ai_knowledge_settings 
ADD COLUMN IF NOT EXISTS projects_enabled BOOLEAN NOT NULL DEFAULT true;

-- Create project_documents table for storing document metadata
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for their organization's projects
CREATE POLICY "Users can view org project documents" ON project_documents
  FOR SELECT USING (
    is_org_member(auth.uid(), organization_id)
  );

-- Policy: Admins/HR/Owners can manage project documents
CREATE POLICY "Admins can insert project documents" ON project_documents
  FOR INSERT WITH CHECK (
    is_org_member(auth.uid(), organization_id) AND (
      has_role(auth.uid(), 'owner') OR 
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'hr')
    )
  );

CREATE POLICY "Admins can update project documents" ON project_documents
  FOR UPDATE USING (
    is_org_member(auth.uid(), organization_id) AND (
      has_role(auth.uid(), 'owner') OR 
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'hr')
    )
  );

CREATE POLICY "Admins can delete project documents" ON project_documents
  FOR DELETE USING (
    is_org_member(auth.uid(), organization_id) AND (
      has_role(auth.uid(), 'owner') OR 
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'hr')
    )
  );

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-documents bucket
CREATE POLICY "Users can view project documents storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT o.id::text FROM organizations o
      INNER JOIN employees e ON e.organization_id = o.id
      WHERE e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can upload project documents storage" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT o.id::text FROM organizations o
      INNER JOIN employees e ON e.organization_id = o.id
      WHERE e.user_id = auth.uid() AND (
        has_role(auth.uid(), 'owner') OR 
        has_role(auth.uid(), 'admin') OR 
        has_role(auth.uid(), 'hr')
      )
    )
  );

CREATE POLICY "Admins can delete project documents storage" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT o.id::text FROM organizations o
      INNER JOIN employees e ON e.organization_id = o.id
      WHERE e.user_id = auth.uid() AND (
        has_role(auth.uid(), 'owner') OR 
        has_role(auth.uid(), 'admin') OR 
        has_role(auth.uid(), 'hr')
      )
    )
  );