-- Create attendance_not_checked_in table to persist historical records
CREATE TABLE public.attendance_not_checked_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  expected_start_time TIME,
  work_location TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, employee_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance_not_checked_in ENABLE ROW LEVEL SECURITY;

-- RLS policy for viewing records
CREATE POLICY "Users can view not checked in records for their org"
  ON public.attendance_not_checked_in FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM employees WHERE user_id = auth.uid()
  ));

-- RLS policy for Owner/Admin/HR to manage records
CREATE POLICY "Owner/Admin/HR can insert not checked in records"
  ON public.attendance_not_checked_in FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Owner/Admin/HR can update not checked in records"
  ON public.attendance_not_checked_in FOR UPDATE
  USING (
    has_role(auth.uid(), 'owner') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Owner/Admin/HR can delete not checked in records"
  ON public.attendance_not_checked_in FOR DELETE
  USING (
    has_role(auth.uid(), 'owner') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hr')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_not_checked_in;

-- Indexes for efficient queries
CREATE INDEX idx_not_checked_in_org_date 
  ON public.attendance_not_checked_in(organization_id, date);
CREATE INDEX idx_not_checked_in_employee_date 
  ON public.attendance_not_checked_in(employee_id, date);

-- Trigger function to delete record when employee checks in
CREATE OR REPLACE FUNCTION delete_not_checked_in_on_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- When someone checks in, remove them from not_checked_in
  IF NEW.check_in_time IS NOT NULL THEN
    DELETE FROM public.attendance_not_checked_in
    WHERE employee_id = NEW.employee_id
      AND date = NEW.date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on attendance_records
CREATE TRIGGER trg_delete_not_checked_in_on_attendance
  AFTER INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION delete_not_checked_in_on_attendance();