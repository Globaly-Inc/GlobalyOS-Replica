-- Drop the existing check constraint
ALTER TABLE posts DROP CONSTRAINT posts_post_type_check;

-- Add the updated check constraint including 'update'
ALTER TABLE posts ADD CONSTRAINT posts_post_type_check 
CHECK (post_type = ANY (ARRAY['win', 'kudos', 'announcement', 'social', 'update', 'executive_message']));