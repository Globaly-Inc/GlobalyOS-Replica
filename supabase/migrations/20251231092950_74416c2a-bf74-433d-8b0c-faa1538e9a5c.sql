-- Create table to track sent check-in reminders
CREATE TABLE public.attendance_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sent_by_employee_id UUID NOT NULL REFERENCES public.employees(id),
  reminder_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reminder_type TEXT NOT NULL DEFAULT 'checkin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, reminder_date, reminder_type)
);

-- Enable RLS
ALTER TABLE public.attendance_reminders ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_reminders
CREATE POLICY "Users can view reminders in their organization"
  ON public.attendance_reminders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/HR can insert reminders"
  ON public.attendance_reminders FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_attendance_reminders_date ON public.attendance_reminders(employee_id, reminder_date, reminder_type);
CREATE INDEX idx_attendance_reminders_org ON public.attendance_reminders(organization_id);