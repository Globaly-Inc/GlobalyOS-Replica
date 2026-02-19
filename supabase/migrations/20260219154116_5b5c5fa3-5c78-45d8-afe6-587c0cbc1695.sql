-- Email Campaigns Module: 5 new tables with RLS

-- Helper function to get org_id for current user (used in RLS)
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.user_is_campaign_manager(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.employees e ON e.user_id = ur.user_id
    WHERE e.user_id = auth.uid()
      AND e.organization_id = org_id
      AND ur.role IN ('owner', 'admin', 'hr')
  )
$$;

-- ─── TABLE 1: email_campaigns ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                text NOT NULL DEFAULT 'Untitled Campaign',
  status              text NOT NULL DEFAULT 'draft',
  subject             text,
  preview_text        text,
  from_name           text,
  from_email          text,
  reply_to            text,
  content_json        jsonb DEFAULT '{"blocks":[],"globalStyles":{"backgroundColor":"#f3f4f6","fontFamily":"Inter, sans-serif","maxWidth":600}}'::jsonb,
  content_html_cache  text,
  audience_source     text NOT NULL DEFAULT 'crm_contacts',
  audience_filters    jsonb DEFAULT '{}'::jsonb,
  recipient_count     integer NOT NULL DEFAULT 0,
  track_opens         boolean NOT NULL DEFAULT true,
  track_clicks        boolean NOT NULL DEFAULT true,
  schedule_at         timestamptz,
  sent_at             timestamptz,
  created_by          uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_campaigns"
  ON public.email_campaigns FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "campaign_managers_all_campaigns"
  ON public.email_campaigns FOR ALL
  TO authenticated
  USING (public.user_is_campaign_manager(organization_id))
  WITH CHECK (public.user_is_campaign_manager(organization_id));

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── TABLE 2: campaign_recipients ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id         uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  contact_id          uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  email               text NOT NULL,
  full_name           text,
  status              text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  unsubscribe_token   text UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  events              jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_org_campaign ON public.campaign_recipients(organization_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_org_contact  ON public.campaign_recipients(organization_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_token        ON public.campaign_recipients(unsubscribe_token);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_recipients"
  ON public.campaign_recipients FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "campaign_managers_all_recipients"
  ON public.campaign_recipients FOR ALL
  TO authenticated
  USING (public.user_is_campaign_manager(organization_id))
  WITH CHECK (public.user_is_campaign_manager(organization_id));

CREATE TRIGGER update_campaign_recipients_updated_at
  BEFORE UPDATE ON public.campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── TABLE 3: email_templates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  category         text NOT NULL DEFAULT 'custom',
  content_json     jsonb NOT NULL DEFAULT '{"blocks":[],"globalStyles":{"backgroundColor":"#f3f4f6","fontFamily":"Inter, sans-serif","maxWidth":600}}'::jsonb,
  thumbnail_url    text,
  created_by       uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "campaign_managers_all_templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (public.user_is_campaign_manager(organization_id))
  WITH CHECK (public.user_is_campaign_manager(organization_id));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── TABLE 4: sender_identities ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sender_identities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name     text NOT NULL,
  from_email       text NOT NULL,
  reply_to         text,
  is_verified      boolean NOT NULL DEFAULT false,
  is_default       boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, from_email)
);

ALTER TABLE public.sender_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_identities"
  ON public.sender_identities FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "campaign_managers_all_identities"
  ON public.sender_identities FOR ALL
  TO authenticated
  USING (public.user_is_campaign_manager(organization_id))
  WITH CHECK (public.user_is_campaign_manager(organization_id));

-- ─── TABLE 5: email_suppressions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email            text NOT NULL,
  type             text NOT NULL DEFAULT 'unsubscribed',
  reason           text,
  campaign_id      uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_org_email ON public.email_suppressions(organization_id, lower(email));

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_suppressions"
  ON public.email_suppressions FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "campaign_managers_all_suppressions"
  ON public.email_suppressions FOR ALL
  TO authenticated
  USING (public.user_is_campaign_manager(organization_id))
  WITH CHECK (public.user_is_campaign_manager(organization_id));