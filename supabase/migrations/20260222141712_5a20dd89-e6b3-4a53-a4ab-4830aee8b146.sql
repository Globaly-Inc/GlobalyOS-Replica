
-- ============================================================
-- Revised Invoicing System Migration
-- ============================================================

-- 1. Create Enums
CREATE TYPE public.crm_invoice_type AS ENUM ('general', 'commission');
CREATE TYPE public.crm_invoice_recipient_type AS ENUM ('contact', 'partner');
CREATE TYPE public.income_sharing_status AS ENUM ('unpaid', 'partially_paid', 'paid');
CREATE TYPE public.income_sharing_receiver_type AS ENUM ('partner', 'office', 'team');
CREATE TYPE public.invoice_schedule_status AS ENUM ('pending', 'generated', 'skipped');
CREATE TYPE public.invoice_comment_author_type AS ENUM ('staff', 'client', 'partner', 'system');
CREATE TYPE public.payment_option_type AS ENUM ('bank_transfer', 'stripe', 'other');
CREATE TYPE public.invoice_tax_type AS ENUM ('inclusive', 'exclusive');

-- 2. Alter accounting_invoices - add new columns
ALTER TABLE public.accounting_invoices
  ADD COLUMN IF NOT EXISTS invoice_type public.crm_invoice_type DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS recipient_type public.crm_invoice_recipient_type DEFAULT 'contact',
  ADD COLUMN IF NOT EXISTS crm_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_partner_id uuid REFERENCES public.crm_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS tax_type public.invoice_tax_type DEFAULT 'exclusive',
  ADD COLUMN IF NOT EXISTS payment_option_id uuid,
  ADD COLUMN IF NOT EXISTS enable_online_payment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS discount_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';

-- 3. Create accounting_payment_options
CREATE TABLE public.accounting_payment_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.payment_option_type NOT NULL DEFAULT 'bank_transfer',
  bank_details jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_payment_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment options in their org"
  ON public.accounting_payment_options FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert payment options in their org"
  ON public.accounting_payment_options FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update payment options in their org"
  ON public.accounting_payment_options FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete payment options in their org"
  ON public.accounting_payment_options FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- Add FK from invoices to payment_options
ALTER TABLE public.accounting_invoices
  ADD CONSTRAINT accounting_invoices_payment_option_id_fkey
  FOREIGN KEY (payment_option_id) REFERENCES public.accounting_payment_options(id) ON DELETE SET NULL;

-- 4. Create accounting_invoice_services
CREATE TABLE public.accounting_invoice_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.accounting_invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.crm_services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  provider_name text,
  deal_fee_id uuid,
  sort_order int DEFAULT 0,
  subtotal numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_invoice_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice services in their org"
  ON public.accounting_invoice_services FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert invoice services in their org"
  ON public.accounting_invoice_services FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update invoice services in their org"
  ON public.accounting_invoice_services FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete invoice services in their org"
  ON public.accounting_invoice_services FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- 5. Alter accounting_invoice_lines - add new columns
ALTER TABLE public.accounting_invoice_lines
  ADD COLUMN IF NOT EXISTS invoice_service_id uuid REFERENCES public.accounting_invoice_services(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fee_type text,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS is_discount boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalment_id uuid;

-- 6. Create accounting_invoice_income_sharing
CREATE TABLE public.accounting_invoice_income_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.accounting_invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_service_id uuid REFERENCES public.accounting_invoice_services(id) ON DELETE SET NULL,
  receiver_type public.income_sharing_receiver_type NOT NULL,
  receiver_id uuid NOT NULL,
  receiver_name text NOT NULL,
  sharing_amount numeric DEFAULT 0,
  tax_mode public.invoice_tax_type DEFAULT 'inclusive',
  tax_rate numeric DEFAULT 10,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status public.income_sharing_status DEFAULT 'unpaid',
  amount_paid numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_invoice_income_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view income sharing in their org"
  ON public.accounting_invoice_income_sharing FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert income sharing in their org"
  ON public.accounting_invoice_income_sharing FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update income sharing in their org"
  ON public.accounting_invoice_income_sharing FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete income sharing in their org"
  ON public.accounting_invoice_income_sharing FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- 7. Create accounting_income_sharing_payments
CREATE TABLE public.accounting_income_sharing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_sharing_id uuid NOT NULL REFERENCES public.accounting_invoice_income_sharing(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  commission_invoice_id uuid REFERENCES public.accounting_invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_income_sharing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view income sharing payments in their org"
  ON public.accounting_income_sharing_payments FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert income sharing payments in their org"
  ON public.accounting_income_sharing_payments FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update income sharing payments in their org"
  ON public.accounting_income_sharing_payments FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete income sharing payments in their org"
  ON public.accounting_income_sharing_payments FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- 8. Create accounting_invoice_schedules
CREATE TABLE public.accounting_invoice_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  deal_fee_id uuid NOT NULL,
  instalment_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  invoice_id uuid REFERENCES public.accounting_invoices(id) ON DELETE SET NULL,
  status public.invoice_schedule_status DEFAULT 'pending',
  auto_send boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_invoice_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice schedules in their org"
  ON public.accounting_invoice_schedules FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert invoice schedules in their org"
  ON public.accounting_invoice_schedules FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update invoice schedules in their org"
  ON public.accounting_invoice_schedules FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete invoice schedules in their org"
  ON public.accounting_invoice_schedules FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- 9. Create accounting_invoice_comments
CREATE TABLE public.accounting_invoice_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.accounting_invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_type public.invoice_comment_author_type NOT NULL DEFAULT 'staff',
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_invoice_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice comments in their org"
  ON public.accounting_invoice_comments FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert invoice comments in their org"
  ON public.accounting_invoice_comments FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update invoice comments in their org"
  ON public.accounting_invoice_comments FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete invoice comments in their org"
  ON public.accounting_invoice_comments FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- 10. Public access policies for public invoice viewing (token-based)
CREATE POLICY "Public can view invoices by token"
  ON public.accounting_invoices FOR SELECT
  USING (public_token IS NOT NULL AND (token_expires_at IS NULL OR token_expires_at > now()));

CREATE POLICY "Public can view invoice services by invoice token"
  ON public.accounting_invoice_services FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.accounting_invoices
    WHERE public_token IS NOT NULL AND (token_expires_at IS NULL OR token_expires_at > now())
  ));

CREATE POLICY "Public can view invoice lines by invoice token"
  ON public.accounting_invoice_lines FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.accounting_invoices
    WHERE public_token IS NOT NULL AND (token_expires_at IS NULL OR token_expires_at > now())
  ));

CREATE POLICY "Public can view invoice payments by invoice token"
  ON public.accounting_invoice_payments FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.accounting_invoices
    WHERE public_token IS NOT NULL AND (token_expires_at IS NULL OR token_expires_at > now())
  ));

CREATE POLICY "Public can view invoice comments by invoice token"
  ON public.accounting_invoice_comments FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.accounting_invoices
    WHERE public_token IS NOT NULL AND (token_expires_at IS NULL OR token_expires_at > now())
  ));

CREATE POLICY "Public can insert comments on public invoices"
  ON public.accounting_invoice_comments FOR INSERT
  WITH CHECK (invoice_id IN (
    SELECT id FROM public.accounting_invoices
    WHERE public_token IS NOT NULL AND (token_expires_at IS NULL OR token_expires_at > now())
  ));

-- 11. Indexes
CREATE INDEX IF NOT EXISTS idx_accounting_invoices_invoice_type ON public.accounting_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_accounting_invoices_recipient_type ON public.accounting_invoices(recipient_type);
CREATE INDEX IF NOT EXISTS idx_accounting_invoices_deal_id ON public.accounting_invoices(deal_id);
CREATE INDEX IF NOT EXISTS idx_accounting_invoices_public_token ON public.accounting_invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_accounting_invoices_crm_contact_id ON public.accounting_invoices(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_accounting_invoices_crm_partner_id ON public.accounting_invoices(crm_partner_id);
CREATE INDEX IF NOT EXISTS idx_accounting_invoice_services_invoice_id ON public.accounting_invoice_services(invoice_id);
CREATE INDEX IF NOT EXISTS idx_accounting_invoice_lines_service_id ON public.accounting_invoice_lines(invoice_service_id);
CREATE INDEX IF NOT EXISTS idx_accounting_invoice_income_sharing_invoice_id ON public.accounting_invoice_income_sharing(invoice_id);
CREATE INDEX IF NOT EXISTS idx_accounting_invoice_schedules_status ON public.accounting_invoice_schedules(status);
CREATE INDEX IF NOT EXISTS idx_accounting_invoice_schedules_date ON public.accounting_invoice_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_accounting_invoice_comments_invoice_id ON public.accounting_invoice_comments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_accounting_payment_options_org ON public.accounting_payment_options(organization_id);
