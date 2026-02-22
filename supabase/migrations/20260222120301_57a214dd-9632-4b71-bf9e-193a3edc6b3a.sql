
-- Create feature_prd_documents table
CREATE TABLE public.feature_prd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_prd_documents ENABLE ROW LEVEL SECURITY;

-- Select: authenticated users can read
CREATE POLICY "Authenticated users can read PRD documents"
ON public.feature_prd_documents FOR SELECT
TO authenticated USING (true);

-- Insert: super admins only
CREATE POLICY "Super admins can insert PRD documents"
ON public.feature_prd_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Delete: super admins only
CREATE POLICY "Super admins can delete PRD documents"
ON public.feature_prd_documents FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('feature-prd-documents', 'feature-prd-documents', false);

-- Storage policies
CREATE POLICY "Authenticated users can read PRD files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'feature-prd-documents');

CREATE POLICY "Super admins can upload PRD files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feature-prd-documents'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admins can delete PRD files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feature-prd-documents'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);
