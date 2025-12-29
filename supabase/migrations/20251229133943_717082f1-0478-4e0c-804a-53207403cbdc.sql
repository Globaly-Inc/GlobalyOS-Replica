-- Add parsed_content column to project_documents for AI context
ALTER TABLE public.project_documents 
ADD COLUMN IF NOT EXISTS parsed_content TEXT;

-- Add index for faster queries on project_id with parsed_content
CREATE INDEX IF NOT EXISTS idx_project_documents_project_parsed 
ON public.project_documents(project_id) 
WHERE parsed_content IS NOT NULL;