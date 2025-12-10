-- Create new flexible leave type balances table
CREATE TABLE public.leave_type_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  balance NUMERIC NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Enable RLS
ALTER TABLE public.leave_type_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own leave type balances"
ON public.leave_type_balances
FOR SELECT
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Managers can view direct reports leave type balances"
ON public.leave_type_balances
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = leave_type_balances.employee_id
  AND e.manager_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
));

CREATE POLICY "HR and admins can view all leave type balances"
ON public.leave_type_balances
FOR SELECT
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "HR and admins can manage leave type balances"
ON public.leave_type_balances
FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_leave_type_balances_updated_at
BEFORE UPDATE ON public.leave_type_balances
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();