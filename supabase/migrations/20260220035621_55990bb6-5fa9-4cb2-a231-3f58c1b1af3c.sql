
-- org_phone_numbers: provisioned Twilio numbers per org
CREATE TABLE public.org_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  twilio_sid text NOT NULL,
  friendly_name text,
  country_code text NOT NULL DEFAULT 'US',
  capabilities jsonb NOT NULL DEFAULT '{"sms":true,"voice":true}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  monthly_cost numeric NOT NULL DEFAULT 0,
  ivr_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_org_phone_numbers_org ON public.org_phone_numbers(organization_id);
CREATE UNIQUE INDEX idx_org_phone_numbers_phone ON public.org_phone_numbers(phone_number);
CREATE UNIQUE INDEX idx_org_phone_numbers_twilio_sid ON public.org_phone_numbers(twilio_sid);

-- RLS
ALTER TABLE public.org_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org phone numbers"
  ON public.org_phone_numbers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org phone numbers"
  ON public.org_phone_numbers FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org phone numbers"
  ON public.org_phone_numbers FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org phone numbers"
  ON public.org_phone_numbers FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_org_phone_numbers_updated_at
  BEFORE UPDATE ON public.org_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- telephony_usage_logs: per-org usage metering
CREATE TABLE public.telephony_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone_number_id uuid NOT NULL REFERENCES public.org_phone_numbers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  direction text NOT NULL,
  duration_seconds integer DEFAULT 0,
  segments integer DEFAULT 1,
  from_number text,
  to_number text,
  twilio_sid text,
  cost numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_telephony_usage_org ON public.telephony_usage_logs(organization_id);
CREATE INDEX idx_telephony_usage_phone ON public.telephony_usage_logs(phone_number_id);
CREATE INDEX idx_telephony_usage_created ON public.telephony_usage_logs(created_at DESC);

-- RLS
ALTER TABLE public.telephony_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org telephony logs"
  ON public.telephony_usage_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org telephony logs"
  ON public.telephony_usage_logs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );
