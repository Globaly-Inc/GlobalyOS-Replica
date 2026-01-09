-- Make stage_id required (NOT NULL) on employee_workflow_tasks
-- First verify there are no NULL stage_id values (already confirmed)
-- Then add the NOT NULL constraint

ALTER TABLE employee_workflow_tasks 
  ALTER COLUMN stage_id SET NOT NULL;