-- Add is_archived column to employee_workflow_tasks table
ALTER TABLE employee_workflow_tasks 
ADD COLUMN is_archived BOOLEAN DEFAULT false;

-- Index for filtering archived tasks efficiently
CREATE INDEX idx_employee_workflow_tasks_archived 
ON employee_workflow_tasks(workflow_id, is_archived);