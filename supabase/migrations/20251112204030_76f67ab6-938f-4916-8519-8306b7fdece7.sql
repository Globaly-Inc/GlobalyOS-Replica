-- =====================================================
-- Position Timeline & Salary Progression
-- Viewable only by managers and HR officers
-- =====================================================

-- Add salary field to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS salary numeric(10,2);

-- Create position_history table for tracking career progression
CREATE TABLE position_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  position text NOT NULL,
  department text NOT NULL,
  salary numeric(10,2),
  manager_id uuid REFERENCES employees(id),
  effective_date date NOT NULL,
  end_date date,
  change_type text NOT NULL, -- 'promotion', 'lateral_move', 'salary_increase', 'manager_change', 'initial'
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_position_history_employee ON position_history(employee_id);
CREATE INDEX idx_position_history_dates ON position_history(effective_date DESC);

-- Enable RLS
ALTER TABLE position_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only HR, admins, and managers can view position history

-- HR and admins can view all position history
CREATE POLICY "HR and admins can view all position history" ON position_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Managers can view their direct reports' position history
CREATE POLICY "Managers can view direct reports history" ON position_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = position_history.employee_id
    AND e.manager_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  )
);

-- HR and admins can manage position history
CREATE POLICY "HR and admins can manage position history" ON position_history
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_position_history_updated_at
BEFORE UPDATE ON position_history
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Create a function to check if user can view employee's sensitive data
CREATE OR REPLACE FUNCTION can_view_employee_sensitive_data(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- User is HR or admin
    has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
    OR
    -- User is the employee's manager
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = _employee_id
      AND e.manager_id IN (
        SELECT id FROM employees WHERE user_id = auth.uid()
      )
    )
  )
$$;