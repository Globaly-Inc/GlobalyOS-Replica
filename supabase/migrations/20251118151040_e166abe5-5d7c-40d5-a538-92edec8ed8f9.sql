-- Create learning_development table
CREATE TABLE public.learning_development (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('certification', 'course', 'training', 'conference', 'workshop', 'seminar', 'other')),
  title TEXT NOT NULL,
  provider TEXT,
  completion_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL CHECK (status IN ('completed', 'in_progress', 'planned')) DEFAULT 'in_progress',
  description TEXT,
  cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_development ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own learning records
CREATE POLICY "Users can view own learning records"
ON public.learning_development
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Policy: Managers can view direct reports' learning records
CREATE POLICY "Managers can view direct reports learning records"
ON public.learning_development
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = learning_development.employee_id
    AND e.manager_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  )
);

-- Policy: HR and admins can view all learning records
CREATE POLICY "HR and admins can view all learning records"
ON public.learning_development
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Policy: Users can insert their own learning records
CREATE POLICY "Users can insert own learning records"
ON public.learning_development
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Policy: HR and admins can insert any learning records
CREATE POLICY "HR and admins can insert learning records"
ON public.learning_development
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Policy: Users can update their own learning records
CREATE POLICY "Users can update own learning records"
ON public.learning_development
FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Policy: HR and admins can update any learning records
CREATE POLICY "HR and admins can update learning records"
ON public.learning_development
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Policy: HR and admins can delete learning records
CREATE POLICY "HR and admins can delete learning records"
ON public.learning_development
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')
);

-- Add trigger for updated_at
CREATE TRIGGER update_learning_development_updated_at
BEFORE UPDATE ON public.learning_development
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();