-- Add logo_url column to projects table
ALTER TABLE projects 
ADD COLUMN logo_url TEXT;

-- Create storage bucket for project logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-logos', 'project-logos', true);

-- RLS policy: Anyone can view project logos
CREATE POLICY "Anyone can view project logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-logos');

-- RLS policy: Admins/HR/Owners can upload project logos
CREATE POLICY "Admins can upload project logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-logos' AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() 
      AND e.organization_id::text = (storage.foldername(name))[1]
      AND (
        has_role(auth.uid(), 'owner') OR 
        has_role(auth.uid(), 'admin') OR 
        has_role(auth.uid(), 'hr')
      )
    )
  );

-- RLS policy: Admins/HR/Owners can update project logos
CREATE POLICY "Admins can update project logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-logos' AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() 
      AND e.organization_id::text = (storage.foldername(name))[1]
      AND (
        has_role(auth.uid(), 'owner') OR 
        has_role(auth.uid(), 'admin') OR 
        has_role(auth.uid(), 'hr')
      )
    )
  );

-- RLS policy: Admins/HR/Owners can delete project logos
CREATE POLICY "Admins can delete project logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-logos' AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() 
      AND e.organization_id::text = (storage.foldername(name))[1]
      AND (
        has_role(auth.uid(), 'owner') OR 
        has_role(auth.uid(), 'admin') OR 
        has_role(auth.uid(), 'hr')
      )
    )
  );