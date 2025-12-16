-- Drop the existing check constraint
ALTER TABLE performance_reviews 
DROP CONSTRAINT IF EXISTS performance_reviews_status_check;

-- Add updated check constraint with new workflow statuses
ALTER TABLE performance_reviews 
ADD CONSTRAINT performance_reviews_status_check 
CHECK (status = ANY (ARRAY[
  'draft'::text,
  'self_assessment_pending'::text,
  'in_progress'::text, 
  'pending_acknowledgment'::text,
  'completed'::text
]));