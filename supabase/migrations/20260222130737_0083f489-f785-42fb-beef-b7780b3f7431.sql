
-- Quotation status enum
CREATE TYPE public.quotation_status AS ENUM (
  'draft', 'sent', 'viewed', 'approved', 'rejected', 'expired', 'processed', 'archived'
);

-- Quotation comment author type
CREATE TYPE public.quotation_comment_author_type AS ENUM (
  'staff', 'client', 'agent', 'system'
);

-- Quotation installment type
CREATE TYPE public.quotation_installment_type AS ENUM (
  'equal', 'custom'
);

-- =====================================================
-- 1. crm_quotations - Main quotation table
-- =====================================================
CREATE TABLE public.crm_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'AUD',
  valid_until DATE,
  payment_details JSONB DEFAULT '{}',
  notes TEXT,
  cover_letter TEXT,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  discount_description TEXT,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_total NUMERIC(12,2) DEFAULT 0,
  grand_total NUMERIC(12,2) DEFAULT 0,
  -- Template fields
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_name TEXT,
  -- Public sharing
  public_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  -- Approval
  approved_at TIMESTAMPTZ,
  approved_option_id UUID,
  approved_by_name TEXT,
  approved_by_email TEXT,
  -- Processing
  processed_deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  processed_invoice_id UUID REFERENCES public.accounting_invoices(id) ON DELETE SET NULL,
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  parent_quotation_id UUID REFERENCES public.crm_quotations(id) ON DELETE SET NULL,
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_crm_quotations_org ON public.crm_quotations(organization_id);
CREATE INDEX idx_crm_quotations_contact ON public.crm_quotations(contact_id);
CREATE INDEX idx_crm_quotations_status ON public.crm_quotations(organization_id, status);
CREATE INDEX idx_crm_quotations_token ON public.crm_quotations(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX idx_crm_quotations_template ON public.crm_quotations(organization_id, is_template) WHERE is_template = true;

-- RLS
ALTER TABLE public.crm_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotations in their org"
  ON public.crm_quotations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create quotations in their org"
  ON public.crm_quotations FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update quotations in their org"
  ON public.crm_quotations FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete quotations in their org"
  ON public.crm_quotations FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 2. crm_quotation_options - Options within a quotation
-- =====================================================
CREATE TABLE public.crm_quotation_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.crm_quotations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Option A',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_total NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_quotation_options_quotation ON public.crm_quotation_options(quotation_id);

ALTER TABLE public.crm_quotation_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage quotation options in their org"
  ON public.crm_quotation_options FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 3. crm_quotation_option_services - Services in each option
-- =====================================================
CREATE TABLE public.crm_quotation_option_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES public.crm_quotation_options(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.crm_services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  partner_id UUID REFERENCES public.crm_partners(id) ON DELETE SET NULL,
  partner_branch_id UUID REFERENCES public.crm_partner_branches(id) ON DELETE SET NULL,
  product_fee_option_id UUID REFERENCES public.crm_product_fee_options(id) ON DELETE SET NULL,
  service_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_qos_option ON public.crm_quotation_option_services(option_id);

ALTER TABLE public.crm_quotation_option_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage quotation option services in their org"
  ON public.crm_quotation_option_services FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 4. crm_quotation_service_fees - Fees for each service
-- =====================================================
CREATE TABLE public.crm_quotation_service_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_service_id UUID NOT NULL REFERENCES public.crm_quotation_option_services(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fee_type_id UUID REFERENCES public.crm_product_fee_types(id) ON DELETE SET NULL,
  fee_name TEXT NOT NULL,
  revenue_type public.fee_revenue_type NOT NULL DEFAULT 'revenue_from_client',
  installment_type public.quotation_installment_type NOT NULL DEFAULT 'equal',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_mode public.tax_mode NOT NULL DEFAULT 'exclusive',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  num_installments INTEGER NOT NULL DEFAULT 1,
  installment_details JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_qsf_option_service ON public.crm_quotation_service_fees(option_service_id);

ALTER TABLE public.crm_quotation_service_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage quotation service fees in their org"
  ON public.crm_quotation_service_fees FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 5. crm_quotation_comments - Comments/notes
-- =====================================================
CREATE TABLE public.crm_quotation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.crm_quotations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_type public.quotation_comment_author_type NOT NULL DEFAULT 'staff',
  author_id UUID,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_qc_quotation ON public.crm_quotation_comments(quotation_id);

ALTER TABLE public.crm_quotation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotation comments in their org"
  ON public.crm_quotation_comments FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create quotation comments in their org"
  ON public.crm_quotation_comments FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 6. crm_quotation_settings - Org-level settings
-- =====================================================
CREATE TABLE public.crm_quotation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  auto_process_on_approve BOOLEAN NOT NULL DEFAULT false,
  auto_create_invoice BOOLEAN NOT NULL DEFAULT false,
  default_currency TEXT NOT NULL DEFAULT 'AUD',
  default_validity_days INTEGER NOT NULL DEFAULT 30,
  quotation_prefix TEXT NOT NULL DEFAULT 'QT-',
  next_quotation_number INTEGER NOT NULL DEFAULT 1,
  default_payment_details JSONB DEFAULT '{}',
  default_cover_letter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_quotation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotation settings in their org"
  ON public.crm_quotation_settings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage quotation settings in their org"
  ON public.crm_quotation_settings FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- =====================================================
-- Updated at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_quotation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_crm_quotations_updated_at
  BEFORE UPDATE ON public.crm_quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_quotation_updated_at();

CREATE TRIGGER trg_crm_quotation_settings_updated_at
  BEFORE UPDATE ON public.crm_quotation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_quotation_updated_at();

-- =====================================================
-- Quotation number generation function
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_quotation_number(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_next INTEGER;
  v_number TEXT;
BEGIN
  -- Get or create settings
  INSERT INTO crm_quotation_settings (organization_id)
  VALUES (p_organization_id)
  ON CONFLICT (organization_id) DO NOTHING;

  -- Get and increment
  UPDATE crm_quotation_settings
  SET next_quotation_number = next_quotation_number + 1
  WHERE organization_id = p_organization_id
  RETURNING quotation_prefix, next_quotation_number - 1 INTO v_prefix, v_next;

  v_number := v_prefix || LPAD(v_next::TEXT, 5, '0');
  RETURN v_number;
END;
$$;
