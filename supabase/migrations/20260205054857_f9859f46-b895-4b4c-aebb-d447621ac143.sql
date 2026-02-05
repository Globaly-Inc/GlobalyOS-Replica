-- Create office_attendance_settings table for per-office attendance configuration
CREATE TABLE public.office_attendance_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_id uuid NOT NULL UNIQUE REFERENCES public.offices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attendance_enabled boolean NOT NULL DEFAULT true,
  
  -- Session settings
  multi_session_enabled boolean NOT NULL DEFAULT true,
  max_sessions_per_day integer NOT NULL DEFAULT 3,
  early_checkout_reason_required boolean NOT NULL DEFAULT true,
  
  -- Automatic adjustments
  auto_adjustments_enabled boolean NOT NULL DEFAULT false,
  overtime_credit_leave_type_id uuid REFERENCES public.office_leave_types(id) ON DELETE SET NULL,
  undertime_debit_leave_type_id uuid REFERENCES public.office_leave_types(id) ON DELETE SET NULL,
  undertime_fallback_leave_type_id uuid REFERENCES public.office_leave_types(id) ON DELETE SET NULL,
  max_dil_days numeric(5,2),
  min_overtime_minutes integer NOT NULL DEFAULT 30,
  min_undertime_minutes integer NOT NULL DEFAULT 15,
  
  -- Auto checkout
  auto_checkout_enabled boolean NOT NULL DEFAULT false,
  auto_checkout_after_minutes integer NOT NULL DEFAULT 60,
  auto_checkout_status text NOT NULL DEFAULT 'present',
  
  -- Check-in methods by work type (qr, location, remote, third_party)
  office_checkin_methods text[] NOT NULL DEFAULT ARRAY['qr', 'location'],
  hybrid_checkin_methods text[] NOT NULL DEFAULT ARRAY['qr', 'location', 'remote'],
  remote_checkin_methods text[] NOT NULL DEFAULT ARRAY['remote'],
  
  -- Location restrictions
  require_location_for_office boolean NOT NULL DEFAULT true,
  require_location_for_hybrid boolean NOT NULL DEFAULT false,
  location_radius_meters integer NOT NULL DEFAULT 100,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create office_attendance_exemptions table for employees exempt from check-in
CREATE TABLE public.office_attendance_exemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  exempted_at timestamptz NOT NULL DEFAULT now(),
  exempted_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(office_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.office_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_attendance_exemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for office_attendance_settings
CREATE POLICY "Users can view attendance settings for their organization offices"
ON public.office_attendance_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = office_attendance_settings.organization_id
  )
);

CREATE POLICY "Admins can manage attendance settings"
ON public.office_attendance_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = office_attendance_settings.organization_id
    AND om.role IN ('owner', 'admin', 'hr')
  )
);

-- RLS policies for office_attendance_exemptions
CREATE POLICY "Users can view attendance exemptions for their organization"
ON public.office_attendance_exemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = office_attendance_exemptions.organization_id
  )
);

CREATE POLICY "Admins can manage attendance exemptions"
ON public.office_attendance_exemptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = office_attendance_exemptions.organization_id
    AND om.role IN ('owner', 'admin', 'hr')
  )
);

-- Trigger to auto-create attendance settings when a new office is created
CREATE OR REPLACE FUNCTION public.create_office_attendance_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.office_attendance_settings (office_id, organization_id)
  VALUES (NEW.id, NEW.organization_id)
  ON CONFLICT (office_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_office_attendance_settings_trigger
AFTER INSERT ON public.offices
FOR EACH ROW
EXECUTE FUNCTION public.create_office_attendance_settings();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_office_attendance_settings_updated_at
BEFORE UPDATE ON public.office_attendance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing organization-level settings to all offices
INSERT INTO public.office_attendance_settings (
  office_id,
  organization_id,
  multi_session_enabled,
  max_sessions_per_day,
  early_checkout_reason_required,
  auto_adjustments_enabled,
  max_dil_days
)
SELECT 
  o.id as office_id,
  o.organization_id,
  COALESCE(org.multi_session_enabled, true) as multi_session_enabled,
  COALESCE(org.max_sessions_per_day, 3) as max_sessions_per_day,
  COALESCE(org.early_checkout_reason_required, true) as early_checkout_reason_required,
  COALESCE(org.auto_attendance_adjustments_enabled, false) as auto_adjustments_enabled,
  org.max_day_in_lieu_days as max_dil_days
FROM public.offices o
JOIN public.organizations org ON org.id = o.organization_id
ON CONFLICT (office_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_office_attendance_settings_org ON public.office_attendance_settings(organization_id);
CREATE INDEX idx_office_attendance_exemptions_office ON public.office_attendance_exemptions(office_id);
CREATE INDEX idx_office_attendance_exemptions_employee ON public.office_attendance_exemptions(employee_id);