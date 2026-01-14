-- Add archived_at and archived_by columns to chat_spaces for archive functionality
ALTER TABLE public.chat_spaces 
ADD COLUMN archived_at timestamptz DEFAULT NULL,
ADD COLUMN archived_by uuid REFERENCES public.employees(id) DEFAULT NULL;

-- Create index for filtering archived spaces efficiently
CREATE INDEX idx_chat_spaces_archived ON public.chat_spaces(archived_at) WHERE archived_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.chat_spaces.archived_at IS 'Timestamp when the space was archived. NULL means not archived.';
COMMENT ON COLUMN public.chat_spaces.archived_by IS 'Employee ID of who archived the space.';