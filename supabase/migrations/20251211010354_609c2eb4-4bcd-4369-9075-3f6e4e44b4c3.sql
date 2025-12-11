-- Add batch_id column to kudos table to track multi-recipient kudos
ALTER TABLE public.kudos 
ADD COLUMN batch_id uuid DEFAULT NULL;

-- Add index for efficient batch lookups
CREATE INDEX idx_kudos_batch_id ON public.kudos(batch_id) WHERE batch_id IS NOT NULL;