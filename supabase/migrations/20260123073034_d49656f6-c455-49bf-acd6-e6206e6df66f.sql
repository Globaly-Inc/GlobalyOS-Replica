-- Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'static-assets';

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Public read access for static-assets" ON storage.objects;

CREATE POLICY "Public read access for static-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'static-assets');