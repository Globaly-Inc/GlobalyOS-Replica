-- Add organization settings for overtime/undertime tracking
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS workday_hours numeric NOT NULL DEFAULT 8,
ADD COLUMN IF NOT EXISTS max_day_in_lieu_days numeric DEFAULT NULL;

-- Create table to track accumulated overtime/undertime hours per employee
CREATE TABLE public.attendance_hour_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  overtime_minutes integer NOT NULL DEFAULT 0,
  undertime_minutes integer NOT NULL DEFAULT 0,
  year integer NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, year)
);

-- Create table to log all automatic leave adjustments
CREATE TABLE public.attendance_leave_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL, -- 'overtime_credit' or 'undertime_deduction'
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  days_adjusted numeric NOT NULL,
  minutes_converted integer NOT NULL,
  attendance_date date NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_hour_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_leave_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_hour_balances
CREATE POLICY "Users can view own hour balances"
ON public.attendance_hour_balances
FOR SELECT
USING (is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports hour balances"
ON public.attendance_hour_balances
FOR SELECT
USING (is_manager_of_employee(employee_id));

CREATE POLICY "HR and admins can manage hour balances"
ON public.attendance_hour_balances
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for attendance_leave_adjustments
CREATE POLICY "Users can view own adjustments"
ON public.attendance_leave_adjustments
FOR SELECT
USING (is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports adjustments"
ON public.attendance_leave_adjustments
FOR SELECT
USING (is_manager_of_employee(employee_id));

CREATE POLICY "HR and admins can manage adjustments"
ON public.attendance_leave_adjustments
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add is_system flag to leave_types to prevent deletion of system types
ALTER TABLE public.leave_types 
ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Create index for faster queries
CREATE INDEX idx_attendance_hour_balances_employee_year ON public.attendance_hour_balances(employee_id, year);
CREATE INDEX idx_attendance_leave_adjustments_employee ON public.attendance_leave_adjustments(employee_id);
CREATE INDEX idx_attendance_leave_adjustments_date ON public.attendance_leave_adjustments(attendance_date);