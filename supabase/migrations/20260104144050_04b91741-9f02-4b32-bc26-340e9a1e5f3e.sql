-- Drop the old constraint that doesn't allow pdf/gif
ALTER TABLE public.post_media 
DROP CONSTRAINT IF EXISTS post_media_media_type_check;

-- Add updated constraint with pdf and gif
ALTER TABLE public.post_media 
ADD CONSTRAINT post_media_media_type_check 
CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'embed'::text, 'pdf'::text, 'gif'::text]));