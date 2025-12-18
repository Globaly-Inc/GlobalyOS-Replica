-- Add is_internal and attachment_url columns to support_request_comments
ALTER TABLE public.support_request_comments 
ADD COLUMN is_internal boolean NOT NULL DEFAULT false,
ADD COLUMN attachment_url text;

-- Add comment to explain column purpose
COMMENT ON COLUMN public.support_request_comments.is_internal IS 'If true, this is an internal note not visible to subscribers';
COMMENT ON COLUMN public.support_request_comments.attachment_url IS 'URL to attached file in storage';

-- Add 'note_added' to activity action types tracking
-- Update existing trigger to handle both comment and note types