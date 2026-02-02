-- Create storage bucket for hiring documents (CVs, resumes, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hiring-documents',
  'hiring-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for hiring-documents bucket
-- Files are stored with path: {organization_id}/{candidate_id}/{filename}

-- Allow authenticated users to upload files to their org's folder
CREATE POLICY "hiring_upload_policy" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hiring-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = (storage.foldername(name))[1]::uuid
    AND e.status = 'active'
  )
);

-- Allow authenticated users to view files from their org
CREATE POLICY "hiring_view_policy" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'hiring-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = (storage.foldername(name))[1]::uuid
    AND e.status = 'active'
  )
);

-- Allow authenticated users to delete files from their org
CREATE POLICY "hiring_delete_policy" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hiring-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = (storage.foldername(name))[1]::uuid
    AND e.status = 'active'
  )
);