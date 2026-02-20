
-- Phase 3: Accounting Invoices, Lines, Payments (prefixed to avoid conflict with billing invoices)

-- Invoice status enum
CREATE TYPE public.accounting_invoice_status AS ENUM ('draft', 'approved', 'sent', 'paid', 'partially_paid', 'overdue', 'voided');

-- Accounting invoices table
CREATE TABLE public.accounting_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  ledger_id UUID NOT NULL REFERENCES public.accounting_ledgers(id),
  office_id UUID NOT NULL REFERENCES public.offices(id),
  contact_id UUID REFERENCES public.accounting_contacts(id),
  invoice_number TEXT NOT NULL,
  reference TEXT,
  status public.accounting_invoice_status NOT NULL DEFAULT 'draft',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days')::date,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(15,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  currency TEXT NOT NULL DEFAULT 'AUD',
  notes TEXT,
  terms TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule JSONB,
  stripe_payment_link_id TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounting invoice lines
CREATE TABLE public.accounting_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.accounting_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  tax_rate_id UUID REFERENCES public.tax_rates(id),
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

-- Accounting invoice payments
CREATE TABLE public.accounting_invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.accounting_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT,
  stripe_payment_id TEXT,
  journal_id UUID REFERENCES public.journals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_acc_invoices_org_ledger_office ON public.accounting_invoices(organization_id, ledger_id, office_id);
CREATE INDEX idx_acc_invoices_status ON public.accounting_invoices(status);
CREATE INDEX idx_acc_invoices_contact ON public.accounting_invoices(contact_id);
CREATE INDEX idx_acc_invoices_date ON public.accounting_invoices(date);
CREATE INDEX idx_acc_invoice_lines_invoice ON public.accounting_invoice_lines(invoice_id);
CREATE INDEX idx_acc_invoice_payments_invoice ON public.accounting_invoice_payments(invoice_id);

-- RLS
ALTER TABLE public.accounting_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_invoice_payments ENABLE ROW LEVEL SECURITY;

-- Invoices RLS
CREATE POLICY "Users can view accounting invoices in their org"
  ON public.accounting_invoices FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can create accounting invoices"
  ON public.accounting_invoices FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update accounting invoices"
  ON public.accounting_invoices FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can delete draft accounting invoices"
  ON public.accounting_invoices FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ) AND status = 'draft');

-- Invoice lines RLS
CREATE POLICY "Users can view accounting invoice lines"
  ON public.accounting_invoice_lines FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.accounting_invoices WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage accounting invoice lines"
  ON public.accounting_invoice_lines FOR ALL
  USING (invoice_id IN (
    SELECT id FROM public.accounting_invoices WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  ));

-- Invoice payments RLS
CREATE POLICY "Users can view accounting invoice payments"
  ON public.accounting_invoice_payments FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.accounting_invoices WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can create accounting invoice payments"
  ON public.accounting_invoice_payments FOR INSERT
  WITH CHECK (invoice_id IN (
    SELECT id FROM public.accounting_invoices WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  ));

-- Updated_at trigger
CREATE TRIGGER update_accounting_invoices_updated_at
  BEFORE UPDATE ON public.accounting_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
