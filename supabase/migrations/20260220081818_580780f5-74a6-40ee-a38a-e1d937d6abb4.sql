
-- ============================================================
-- Phase 1: Accounting Foundation Tables
-- ============================================================

-- Enums
CREATE TYPE public.accounting_scope_type AS ENUM ('OFFICE_SINGLE', 'OFFICE_SET', 'ORG_WIDE');
CREATE TYPE public.accounting_setup_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.accounting_account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE public.accounting_contact_type AS ENUM ('customer', 'supplier', 'both');

-- accounting_setups
CREATE TABLE public.accounting_setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_type public.accounting_scope_type NOT NULL,
  base_currency text NOT NULL DEFAULT 'AUD',
  tax_inclusive boolean NOT NULL DEFAULT true,
  status public.accounting_setup_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounting setups in their org"
  ON public.accounting_setups FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert accounting setups"
  ON public.accounting_setups FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND om.organization_id = accounting_setups.organization_id
    AND ur.role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update accounting setups"
  ON public.accounting_setups FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND om.organization_id = accounting_setups.organization_id
    AND ur.role IN ('owner', 'admin')
  ));

-- accounting_setup_offices (junction)
CREATE TABLE public.accounting_setup_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_id uuid NOT NULL REFERENCES public.accounting_setups(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  UNIQUE(setup_id, office_id)
);

ALTER TABLE public.accounting_setup_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view setup offices via setup org"
  ON public.accounting_setup_offices FOR SELECT TO authenticated
  USING (setup_id IN (
    SELECT s.id FROM public.accounting_setups s
    JOIN public.organization_members om ON om.organization_id = s.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage setup offices"
  ON public.accounting_setup_offices FOR INSERT TO authenticated
  WITH CHECK (setup_id IN (
    SELECT s.id FROM public.accounting_setups s
    JOIN public.organization_members om ON om.organization_id = s.organization_id
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND ur.role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can delete setup offices"
  ON public.accounting_setup_offices FOR DELETE TO authenticated
  USING (setup_id IN (
    SELECT s.id FROM public.accounting_setups s
    JOIN public.organization_members om ON om.organization_id = s.organization_id
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND ur.role IN ('owner', 'admin')
  ));

-- accounting_ledgers
CREATE TABLE public.accounting_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  setup_id uuid NOT NULL REFERENCES public.accounting_setups(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_ledgers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ledgers in their org"
  ON public.accounting_ledgers FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert ledgers"
  ON public.accounting_ledgers FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND om.organization_id = accounting_ledgers.organization_id
    AND ur.role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update ledgers"
  ON public.accounting_ledgers FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND om.organization_id = accounting_ledgers.organization_id
    AND ur.role IN ('owner', 'admin')
  ));

-- chart_of_accounts
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id uuid NOT NULL REFERENCES public.accounting_ledgers(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type public.accounting_account_type NOT NULL,
  sub_type text,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  parent_id uuid REFERENCES public.chart_of_accounts(id),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ledger_id, code)
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view COA in their org"
  ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (ledger_id IN (
    SELECT l.id FROM public.accounting_ledgers l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert COA"
  ON public.chart_of_accounts FOR INSERT TO authenticated
  WITH CHECK (ledger_id IN (
    SELECT l.id FROM public.accounting_ledgers l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND ur.role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update COA"
  ON public.chart_of_accounts FOR UPDATE TO authenticated
  USING (ledger_id IN (
    SELECT l.id FROM public.accounting_ledgers l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND ur.role IN ('owner', 'admin')
  ));

-- tax_rates
CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tax rates in their org"
  ON public.tax_rates FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage tax rates"
  ON public.tax_rates FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND ur.role IN ('owner', 'admin')
  ));

-- accounting_contacts
CREATE TABLE public.accounting_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  contact_type public.accounting_contact_type NOT NULL DEFAULT 'customer',
  billing_address jsonb,
  tax_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounting contacts in their org"
  ON public.accounting_contacts FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage accounting contacts"
  ON public.accounting_contacts FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND ur.role IN ('owner', 'admin')
  ));

-- accounting_audit_events
CREATE TABLE public.accounting_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ledger_id uuid REFERENCES public.accounting_ledgers(id),
  office_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid NOT NULL,
  before_data jsonb,
  after_data jsonb,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit events in their org"
  ON public.accounting_audit_events FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE om.user_id = auth.uid() AND ur.role IN ('owner', 'admin')
  ));

CREATE POLICY "System can insert audit events"
  ON public.accounting_audit_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_accounting_setups_org ON public.accounting_setups(organization_id);
CREATE INDEX idx_accounting_ledgers_org ON public.accounting_ledgers(organization_id);
CREATE INDEX idx_accounting_ledgers_setup ON public.accounting_ledgers(setup_id);
CREATE INDEX idx_chart_of_accounts_ledger ON public.chart_of_accounts(ledger_id);
CREATE INDEX idx_chart_of_accounts_type ON public.chart_of_accounts(ledger_id, type);
CREATE INDEX idx_tax_rates_org ON public.tax_rates(organization_id);
CREATE INDEX idx_accounting_contacts_org ON public.accounting_contacts(organization_id);
CREATE INDEX idx_accounting_audit_org ON public.accounting_audit_events(organization_id);
CREATE INDEX idx_accounting_audit_entity ON public.accounting_audit_events(entity_type, entity_id);

-- Updated_at trigger for accounting_setups
CREATE TRIGGER update_accounting_setups_updated_at
  BEFORE UPDATE ON public.accounting_setups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for accounting_contacts
CREATE TRIGGER update_accounting_contacts_updated_at
  BEFORE UPDATE ON public.accounting_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
