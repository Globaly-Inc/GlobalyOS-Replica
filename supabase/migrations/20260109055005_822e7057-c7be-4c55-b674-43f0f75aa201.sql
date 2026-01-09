-- Add auto_advance_stages setting to workflow templates
ALTER TABLE workflow_templates
ADD COLUMN IF NOT EXISTS auto_advance_stages BOOLEAN DEFAULT false;