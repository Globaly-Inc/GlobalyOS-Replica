-- Create attendance_report_schedules table for auto AI reporting
CREATE TABLE IF NOT EXISTS public.attendance_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  frequency TEXT CHECK (frequency IN ('weekly', 'monthly')) DEFAULT 'weekly',
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28),
  time_of_day TIME DEFAULT '09:00:00',
  recipients JSONB DEFAULT '{"owner": true, "admin": true, "hr": true, "manager": false}'::jsonb,
  include_ai_summary BOOLEAN DEFAULT true,
  include_charts BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.attendance_report_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owner/Admin/HR can view report schedules"
  ON public.attendance_report_schedules FOR SELECT
  TO authenticated
  USING (
    is_org_member(auth.uid(), organization_id) AND (
      has_role(auth.uid(), 'owner') OR 
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'hr')
    )
  );

CREATE POLICY "Owner/Admin/HR can manage report schedules"
  ON public.attendance_report_schedules FOR ALL
  TO authenticated
  USING (
    is_org_member(auth.uid(), organization_id) AND (
      has_role(auth.uid(), 'owner') OR 
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'hr')
    )
  )
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) AND (
      has_role(auth.uid(), 'owner') OR 
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'hr')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_attendance_report_schedules_updated_at
  BEFORE UPDATE ON public.attendance_report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();