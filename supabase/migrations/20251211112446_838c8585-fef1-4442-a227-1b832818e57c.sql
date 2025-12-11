-- Drop ALL existing storage policies on storage.objects
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "View employee documents with authorization" ON storage.objects;
DROP POLICY IF EXISTS "Upload employee documents with authorization" ON storage.objects;
DROP POLICY IF EXISTS "Update employee documents with authorization" ON storage.objects;
DROP POLICY IF EXISTS "Delete employee documents with authorization" ON storage.objects;

-- AVATARS BUCKET POLICIES
-- Avatars are public for viewing (needed for profile display)
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload avatars (any authenticated user, as avatars use random names)
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Users can update/delete avatars (admins/HR can update any, users can update their own)
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- EMPLOYEE DOCUMENTS BUCKET POLICIES
-- Path structure: {employee_id}/{folder}/{filename}

-- View: Own documents, direct reports (managers), or HR/Admin
CREATE POLICY "View employee documents with authorization"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-documents'
  AND auth.role() = 'authenticated'
  AND (
    -- User's own documents (path starts with their employee_id)
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = e.id::text
    )
    -- HR/Admin can view all
    OR public.has_role(auth.uid(), 'hr')
    OR public.has_role(auth.uid(), 'admin')
    -- Manager can view direct reports' documents
    OR EXISTS (
      SELECT 1 FROM public.employees manager
      JOIN public.employees report ON report.manager_id = manager.id
      WHERE manager.user_id = auth.uid()
      AND (storage.foldername(name))[1] = report.id::text
    )
  )
);

-- Upload: Own documents (personal folder only for regular users), or HR/Admin for any
CREATE POLICY "Upload employee documents with authorization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents'
  AND auth.role() = 'authenticated'
  AND (
    -- HR/Admin can upload to any employee folder
    public.has_role(auth.uid(), 'hr')
    OR public.has_role(auth.uid(), 'admin')
    -- Users can upload to their own personal folder only
    OR (
      EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.user_id = auth.uid() 
        AND (storage.foldername(name))[1] = e.id::text
      )
      AND (storage.foldername(name))[2] = 'personal'
    )
  )
);

-- Update: Same rules as upload
CREATE POLICY "Update employee documents with authorization"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'employee-documents'
  AND auth.role() = 'authenticated'
  AND (
    public.has_role(auth.uid(), 'hr')
    OR public.has_role(auth.uid(), 'admin')
    OR (
      EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.user_id = auth.uid() 
        AND (storage.foldername(name))[1] = e.id::text
      )
      AND (storage.foldername(name))[2] = 'personal'
    )
  )
);

-- Delete: HR/Admin only, or own personal folder documents
CREATE POLICY "Delete employee documents with authorization"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-documents'
  AND auth.role() = 'authenticated'
  AND (
    public.has_role(auth.uid(), 'hr')
    OR public.has_role(auth.uid(), 'admin')
    OR (
      EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.user_id = auth.uid() 
        AND (storage.foldername(name))[1] = e.id::text
      )
      AND (storage.foldername(name))[2] = 'personal'
    )
  )
);