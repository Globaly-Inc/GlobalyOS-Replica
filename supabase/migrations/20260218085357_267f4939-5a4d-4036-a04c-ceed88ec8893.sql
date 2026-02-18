ALTER TABLE pipeline_stage_rules 
  ADD COLUMN IF NOT EXISTS email_trigger_type TEXT;