-- Create storage bucket for wiki attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('wiki-attachments', 'wiki-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for wiki-attachments bucket
CREATE POLICY "Authenticated users can upload wiki attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wiki-attachments');

CREATE POLICY "Authenticated users can view wiki attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'wiki-attachments');

CREATE POLICY "HR and Admin can delete wiki attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wiki-attachments' 
  AND (
    public.has_role(auth.uid(), 'hr') 
    OR public.has_role(auth.uid(), 'admin')
  )
);