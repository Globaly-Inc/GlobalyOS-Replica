-- Create leave balances table
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  vacation_days NUMERIC NOT NULL DEFAULT 0,
  sick_days NUMERIC NOT NULL DEFAULT 0,
  pto_days NUMERIC NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, year)
);

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'pto')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_days_count CHECK (days_count > 0)
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_balances
CREATE POLICY "Users can view own leave balances"
  ON public.leave_balances FOR SELECT
  USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR and admins can view all leave balances"
  ON public.leave_balances FOR SELECT
  USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view direct reports leave balances"
  ON public.leave_balances FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = leave_balances.employee_id
    AND e.manager_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "HR and admins can manage leave balances"
  ON public.leave_balances FOR ALL
  USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for leave_requests
CREATE POLICY "Users can view own leave requests"
  ON public.leave_requests FOR SELECT
  USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR and admins can view all leave requests"
  ON public.leave_requests FOR SELECT
  USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view direct reports leave requests"
  ON public.leave_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = leave_requests.employee_id
    AND e.manager_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create own leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR and admins can manage leave requests"
  ON public.leave_requests FOR ALL
  USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can update direct reports leave requests"
  ON public.leave_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = leave_requests.employee_id
    AND e.manager_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  ));

-- Triggers for updated_at
CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();