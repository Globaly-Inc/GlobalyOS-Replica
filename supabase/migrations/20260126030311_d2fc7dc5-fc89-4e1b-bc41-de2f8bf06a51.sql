-- Add auto-reindex configuration columns to ai_knowledge_settings
ALTER TABLE ai_knowledge_settings
ADD COLUMN IF NOT EXISTS auto_reindex_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_reindex_hour INTEGER DEFAULT 2 CHECK (auto_reindex_hour >= 0 AND auto_reindex_hour <= 23),
ADD COLUMN IF NOT EXISTS last_auto_reindex_at TIMESTAMPTZ;