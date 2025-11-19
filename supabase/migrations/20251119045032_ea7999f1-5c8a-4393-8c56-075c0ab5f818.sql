-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  work_hours NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600
      ELSE NULL
    END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create attendance summary view for statistics
CREATE VIEW public.attendance_summary AS
SELECT 
  employee_id,
  DATE_TRUNC('month', date) as month,
  COUNT(*) as total_days,
  COUNT(*) FILTER (WHERE status = 'present') as present_days,
  COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
  COUNT(*) FILTER (WHERE status = 'late') as late_days,
  COUNT(*) FILTER (WHERE status = 'half_day') as half_days,
  ROUND(AVG(work_hours)::numeric, 2) as avg_work_hours,
  ROUND(SUM(work_hours)::numeric, 2) as total_work_hours
FROM attendance_records
WHERE check_in_time IS NOT NULL
GROUP BY employee_id, DATE_TRUNC('month', date);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_records
CREATE POLICY "Users can view own attendance"
  ON public.attendance_records FOR SELECT
  USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR and admins can view all attendance"
  ON public.attendance_records FOR SELECT
  USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view direct reports attendance"
  ON public.attendance_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = attendance_records.employee_id
    AND e.manager_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can check in for themselves"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    AND date = CURRENT_DATE
  );

CREATE POLICY "Users can update own attendance"
  ON public.attendance_records FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    AND date = CURRENT_DATE
  );

CREATE POLICY "HR and admins can manage all attendance"
  ON public.attendance_records FOR ALL
  USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();