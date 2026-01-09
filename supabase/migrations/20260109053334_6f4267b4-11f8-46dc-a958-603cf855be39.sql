-- Add current_stage_id column to track explicit workflow stage
ALTER TABLE employee_workflows
ADD COLUMN current_stage_id UUID REFERENCES workflow_stages(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_employee_workflows_current_stage_id ON employee_workflows(current_stage_id);

-- Update existing active workflows to set current_stage_id based on first incomplete stage
-- This is a one-time migration for existing data
WITH workflow_first_incomplete_stage AS (
  SELECT DISTINCT ON (ew.id)
    ew.id as workflow_id,
    ws.id as stage_id
  FROM employee_workflows ew
  LEFT JOIN workflow_stages ws ON ws.template_id = ew.template_id
  LEFT JOIN employee_workflow_tasks ewt ON ewt.workflow_id = ew.id AND ewt.stage_id = ws.id
  WHERE ew.status = 'active'
  ORDER BY ew.id, ws.sort_order ASC
)
UPDATE employee_workflows ew
SET current_stage_id = wfis.stage_id
FROM workflow_first_incomplete_stage wfis
WHERE ew.id = wfis.workflow_id
AND ew.status = 'active';