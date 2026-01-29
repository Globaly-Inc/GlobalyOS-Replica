-- Add sort_order column to chat_favorites
ALTER TABLE chat_favorites 
ADD COLUMN sort_order integer DEFAULT 0;

-- Update existing favorites to have sequential sort orders based on creation date
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY employee_id, organization_id 
    ORDER BY created_at ASC
  ) - 1 as new_order
  FROM chat_favorites
)
UPDATE chat_favorites 
SET sort_order = ordered.new_order
FROM ordered 
WHERE chat_favorites.id = ordered.id;