-- Create leave_balance_logs table to track all leave balance changes
CREATE TABLE public.leave_balance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  leave_type TEXT NOT NULL, -- vacation, sick, pto
  change_amount NUMERIC NOT NULL, -- positive for addition, negative for deduction
  previous_balance NUMERIC NOT NULL DEFAULT 0,
  new_balance NUMERIC NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_balance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "HR and admins can manage leave balance logs"
ON public.leave_balance_logs
FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "HR and admins can view all leave balance logs"
ON public.leave_balance_logs
FOR SELECT
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view direct reports leave balance logs"
ON public.leave_balance_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = leave_balance_logs.employee_id
    AND e.manager_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can view own leave balance logs"
ON public.leave_balance_logs
FOR SELECT
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Add index for faster queries
CREATE INDEX idx_leave_balance_logs_employee ON public.leave_balance_logs(employee_id);
CREATE INDEX idx_leave_balance_logs_created_at ON public.leave_balance_logs(created_at DESC);