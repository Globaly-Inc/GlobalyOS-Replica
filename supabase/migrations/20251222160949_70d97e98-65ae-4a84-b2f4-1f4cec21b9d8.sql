-- Migrate updates to posts table
INSERT INTO posts (id, organization_id, employee_id, post_type, content, access_scope, is_pinned, is_published, is_deleted, created_at, updated_at)
SELECT 
  id,
  organization_id,
  employee_id,
  type::text,
  content,
  COALESCE(access_scope, 'company'),
  false,
  true,
  false,
  created_at,
  COALESCE(updated_at, created_at)
FROM updates
WHERE id NOT IN (SELECT id FROM posts WHERE id = updates.id)
ON CONFLICT (id) DO NOTHING;

-- Migrate update images to post_media
INSERT INTO post_media (id, post_id, organization_id, media_type, file_url, sort_order, created_at)
SELECT 
  gen_random_uuid(),
  id,
  organization_id,
  'image',
  image_url,
  0,
  created_at
FROM updates
WHERE image_url IS NOT NULL
AND id NOT IN (SELECT post_id FROM post_media WHERE post_id = updates.id)
ON CONFLICT DO NOTHING;

-- Migrate kudos to posts table
INSERT INTO posts (id, organization_id, employee_id, post_type, content, kudos_recipient_ids, access_scope, is_pinned, is_published, is_deleted, created_at, updated_at)
SELECT 
  id,
  organization_id,
  given_by_id,
  'kudos',
  comment,
  ARRAY[employee_id],
  COALESCE(access_scope, 'company'),
  false,
  true,
  false,
  created_at,
  COALESCE(updated_at, created_at)
FROM kudos
WHERE id NOT IN (SELECT id FROM posts WHERE id = kudos.id)
ON CONFLICT (id) DO NOTHING;

-- Migrate feed_reactions to post_reactions (for updates)
INSERT INTO post_reactions (id, post_id, organization_id, employee_id, emoji, created_at)
SELECT 
  gen_random_uuid(),
  fr.target_id,
  fr.organization_id,
  fr.employee_id,
  fr.emoji,
  fr.created_at
FROM feed_reactions fr
WHERE fr.target_type = 'update'
AND fr.target_id IN (SELECT id FROM posts)
AND NOT EXISTS (
  SELECT 1 FROM post_reactions pr 
  WHERE pr.post_id = fr.target_id 
  AND pr.employee_id = fr.employee_id 
  AND pr.emoji = fr.emoji
)
ON CONFLICT DO NOTHING;

-- Migrate feed_reactions to post_reactions (for kudos)
INSERT INTO post_reactions (id, post_id, organization_id, employee_id, emoji, created_at)
SELECT 
  gen_random_uuid(),
  fr.target_id,
  fr.organization_id,
  fr.employee_id,
  fr.emoji,
  fr.created_at
FROM feed_reactions fr
WHERE fr.target_type = 'kudos'
AND fr.target_id IN (SELECT id FROM posts)
AND NOT EXISTS (
  SELECT 1 FROM post_reactions pr 
  WHERE pr.post_id = fr.target_id 
  AND pr.employee_id = fr.employee_id 
  AND pr.emoji = fr.emoji
)
ON CONFLICT DO NOTHING;