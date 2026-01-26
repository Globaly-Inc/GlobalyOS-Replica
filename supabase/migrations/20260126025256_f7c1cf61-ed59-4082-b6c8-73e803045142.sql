-- Add progress tracking columns to ai_indexing_status
ALTER TABLE ai_indexing_status 
ADD COLUMN IF NOT EXISTS current_source TEXT,
ADD COLUMN IF NOT EXISTS sources_completed TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_sources INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS records_indexed INTEGER DEFAULT 0;