-- Drop all existing policies on storage.objects for avatars bucket
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder or authorized areas" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Recreate with secure path-based access control
-- SELECT: Anyone can view avatars (bucket is public)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- INSERT: Users can upload to their own folder, posts folder (with their employee_id), or admin areas
CREATE POLICY "Users can upload to own folder or authorized areas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (
      (storage.foldername(name))[1] = 'posts' AND
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
    OR
    (
      (storage.foldername(name))[1] = 'org-logos' AND
      public.has_role(auth.uid(), 'admin')
    )
    OR
    (
      (storage.foldername(name))[1] = 'invites' AND
      (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
    )
  )
);

-- UPDATE: Users can only update files they own
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (
      (storage.foldername(name))[1] = 'posts' AND
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
    OR
    (
      (storage.foldername(name))[1] = 'org-logos' AND
      public.has_role(auth.uid(), 'admin')
    )
    OR
    (
      (storage.foldername(name))[1] = 'invites' AND
      (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
    )
  )
);

-- DELETE: Users can only delete files they own
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (
      (storage.foldername(name))[1] = 'posts' AND
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
    OR
    (
      (storage.foldername(name))[1] = 'org-logos' AND
      public.has_role(auth.uid(), 'admin')
    )
    OR
    (
      (storage.foldername(name))[1] = 'invites' AND
      (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
    )
  )
);