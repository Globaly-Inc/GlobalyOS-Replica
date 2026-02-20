
-- Create storage bucket for form builder media
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-media', 'form-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload form media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'form-media');

-- Allow public read access
CREATE POLICY "Public can view form media"
ON storage.objects FOR SELECT
USING (bucket_id = 'form-media');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete form media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'form-media');
