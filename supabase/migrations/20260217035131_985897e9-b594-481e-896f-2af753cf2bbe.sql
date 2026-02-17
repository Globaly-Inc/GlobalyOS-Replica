
-- Storage policies for task-attachments bucket (bucket already exists)
-- Allow authenticated users to upload task attachments
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to view task attachments
CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete task attachments
CREATE POLICY "Authenticated users can delete task attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND auth.role() = 'authenticated'
);

-- Make the bucket public for reading (so URLs work)
UPDATE storage.buckets SET public = true WHERE id = 'task-attachments';
