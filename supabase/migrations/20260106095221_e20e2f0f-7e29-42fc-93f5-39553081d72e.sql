-- Create system-assets bucket for public system files like logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-assets', 'system-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access for system assets
CREATE POLICY "Public read access for system assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'system-assets');

-- Allow authenticated users to upload system assets (admin only in practice)
CREATE POLICY "Authenticated users can upload system assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'system-assets');