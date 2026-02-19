
-- ========================================================
-- Scheduler Module: 4 new tables + RLS
-- ========================================================

-- Table 1: scheduler_event_types
CREATE TABLE public.scheduler_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'one_on_one',
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 30,
  location_type text NOT NULL DEFAULT 'google_meet',
  location_value text,
  is_active boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- Table 2: scheduler_event_hosts
CREATE TABLE public.scheduler_event_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id uuid NOT NULL REFERENCES public.scheduler_event_types(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  routing_weight int NOT NULL DEFAULT 1,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table 3: scheduler_bookings
CREATE TABLE public.scheduler_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type_id uuid NOT NULL REFERENCES public.scheduler_event_types(id) ON DELETE CASCADE,
  host_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  invitee_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  invitee_name text NOT NULL,
  invitee_email text NOT NULL,
  invitee_timezone text NOT NULL DEFAULT 'UTC',
  answers_json jsonb DEFAULT '{}'::jsonb,
  start_at_utc timestamptz NOT NULL,
  end_at_utc timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  cancel_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  google_event_id text,
  google_meet_link text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 4: scheduler_integration_settings (Phase 2 stub)
CREATE TABLE public.scheduler_integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  is_google_meet_enabled boolean NOT NULL DEFAULT false,
  primary_calendar_id text,
  availability_calendar_ids text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, provider)
);

-- Indexes
CREATE INDEX idx_scheduler_event_types_org ON public.scheduler_event_types(organization_id);
CREATE INDEX idx_scheduler_event_types_slug ON public.scheduler_event_types(organization_id, slug);
CREATE INDEX idx_scheduler_event_hosts_event ON public.scheduler_event_hosts(event_type_id);
CREATE INDEX idx_scheduler_event_hosts_employee ON public.scheduler_event_hosts(employee_id);
CREATE INDEX idx_scheduler_bookings_org ON public.scheduler_bookings(organization_id);
CREATE INDEX idx_scheduler_bookings_event ON public.scheduler_bookings(event_type_id);
CREATE INDEX idx_scheduler_bookings_status ON public.scheduler_bookings(status);
CREATE INDEX idx_scheduler_bookings_token ON public.scheduler_bookings(cancel_token);
CREATE INDEX idx_scheduler_bookings_start ON public.scheduler_bookings(start_at_utc);

-- Enable RLS
ALTER TABLE public.scheduler_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_event_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_integration_settings ENABLE ROW LEVEL SECURITY;

-- ---- RLS Policies for scheduler_event_types ----
CREATE POLICY "scheduler_event_types_select" ON public.scheduler_event_types
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

CREATE POLICY "scheduler_event_types_insert" ON public.scheduler_event_types
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_crm_org_id());

CREATE POLICY "scheduler_event_types_update" ON public.scheduler_event_types
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

CREATE POLICY "scheduler_event_types_delete" ON public.scheduler_event_types
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

-- ---- RLS Policies for scheduler_event_hosts ----
CREATE POLICY "scheduler_event_hosts_select" ON public.scheduler_event_hosts
  FOR SELECT TO authenticated
  USING (
    event_type_id IN (
      SELECT id FROM public.scheduler_event_types
      WHERE organization_id = public.get_user_crm_org_id()
    )
  );

CREATE POLICY "scheduler_event_hosts_insert" ON public.scheduler_event_hosts
  FOR INSERT TO authenticated
  WITH CHECK (
    event_type_id IN (
      SELECT id FROM public.scheduler_event_types
      WHERE organization_id = public.get_user_crm_org_id()
    )
  );

CREATE POLICY "scheduler_event_hosts_update" ON public.scheduler_event_hosts
  FOR UPDATE TO authenticated
  USING (
    event_type_id IN (
      SELECT id FROM public.scheduler_event_types
      WHERE organization_id = public.get_user_crm_org_id()
    )
  );

CREATE POLICY "scheduler_event_hosts_delete" ON public.scheduler_event_hosts
  FOR DELETE TO authenticated
  USING (
    event_type_id IN (
      SELECT id FROM public.scheduler_event_types
      WHERE organization_id = public.get_user_crm_org_id()
    )
  );

-- ---- RLS Policies for scheduler_bookings ----
-- Authenticated org members can read all bookings for their org
CREATE POLICY "scheduler_bookings_select" ON public.scheduler_bookings
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

-- Authenticated org members can update (reschedule/cancel, mark no-show)
CREATE POLICY "scheduler_bookings_update" ON public.scheduler_bookings
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

-- Anyone (anon) can INSERT a booking (public booking page)
CREATE POLICY "scheduler_bookings_insert_anon" ON public.scheduler_bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated users can also insert (e.g., internal booking)
CREATE POLICY "scheduler_bookings_insert_auth" ON public.scheduler_bookings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_crm_org_id());

-- ---- RLS Policies for scheduler_integration_settings ----
CREATE POLICY "scheduler_integration_settings_select" ON public.scheduler_integration_settings
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

CREATE POLICY "scheduler_integration_settings_insert" ON public.scheduler_integration_settings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_crm_org_id());

CREATE POLICY "scheduler_integration_settings_update" ON public.scheduler_integration_settings
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

-- Updated_at triggers
CREATE TRIGGER update_scheduler_event_types_updated_at
  BEFORE UPDATE ON public.scheduler_event_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduler_bookings_updated_at
  BEFORE UPDATE ON public.scheduler_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduler_integration_settings_updated_at
  BEFORE UPDATE ON public.scheduler_integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
