-- Create static-assets bucket for storing platform assets like pitch deck
INSERT INTO storage.buckets (id, name, public)
VALUES ('static-assets', 'static-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to static assets
CREATE POLICY "Public read access for static assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'static-assets');

-- Allow service role to upload static assets
CREATE POLICY "Service role can upload static assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'static-assets');