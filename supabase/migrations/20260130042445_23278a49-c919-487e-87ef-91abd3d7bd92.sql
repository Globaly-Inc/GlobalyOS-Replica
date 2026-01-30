-- Fix ai_usage_logs query_type constraint to allow more types
-- Drop the existing constraint
ALTER TABLE public.ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_query_type_check;

-- Add new constraint with all needed query types
ALTER TABLE public.ai_usage_logs ADD CONSTRAINT ai_usage_logs_query_type_check 
CHECK (query_type = ANY (ARRAY[
  'internal'::text, 
  'general'::text, 
  'ai_writing_assist'::text,
  'wiki_ask_ai'::text,
  'global_ask_ai'::text,
  'position_description'::text,
  'profile_summary'::text,
  'performance_review'::text,
  'content_generation'::text
]));