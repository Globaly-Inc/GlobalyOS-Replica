
-- Phase 4: Accounting Bills, Bill Lines, Bill Payments

-- Bill status enum
CREATE TYPE public.accounting_bill_status AS ENUM ('draft', 'approved', 'paid', 'partially_paid', 'overdue', 'voided');

-- Accounting bills table
CREATE TABLE public.accounting_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  ledger_id UUID NOT NULL REFERENCES public.accounting_ledgers(id),
  office_id UUID NOT NULL REFERENCES public.offices(id),
  contact_id UUID REFERENCES public.accounting_contacts(id),
  bill_number TEXT NOT NULL,
  reference TEXT,
  status public.accounting_bill_status NOT NULL DEFAULT 'draft',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days')::date,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(15,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  currency TEXT NOT NULL DEFAULT 'AUD',
  notes TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bill lines
CREATE TABLE public.accounting_bill_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.accounting_bills(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  tax_rate_id UUID REFERENCES public.tax_rates(id),
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

-- Bill payments
CREATE TABLE public.accounting_bill_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.accounting_bills(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT,
  journal_id UUID REFERENCES public.journals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_acc_bills_org_ledger_office ON public.accounting_bills(organization_id, ledger_id, office_id);
CREATE INDEX idx_acc_bills_status ON public.accounting_bills(status);
CREATE INDEX idx_acc_bills_contact ON public.accounting_bills(contact_id);
CREATE INDEX idx_acc_bills_date ON public.accounting_bills(date);
CREATE INDEX idx_acc_bill_lines_bill ON public.accounting_bill_lines(bill_id);
CREATE INDEX idx_acc_bill_payments_bill ON public.accounting_bill_payments(bill_id);

-- RLS
ALTER TABLE public.accounting_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bill_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bill_payments ENABLE ROW LEVEL SECURITY;

-- Bills RLS
CREATE POLICY "Users can view accounting bills in their org"
  ON public.accounting_bills FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can create accounting bills"
  ON public.accounting_bills FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update accounting bills"
  ON public.accounting_bills FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can delete draft accounting bills"
  ON public.accounting_bills FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ) AND status = 'draft');

-- Bill lines RLS
CREATE POLICY "Users can view accounting bill lines"
  ON public.accounting_bill_lines FOR SELECT
  USING (bill_id IN (
    SELECT id FROM public.accounting_bills WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage accounting bill lines"
  ON public.accounting_bill_lines FOR ALL
  USING (bill_id IN (
    SELECT id FROM public.accounting_bills WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  ));

-- Bill payments RLS
CREATE POLICY "Users can view accounting bill payments"
  ON public.accounting_bill_payments FOR SELECT
  USING (bill_id IN (
    SELECT id FROM public.accounting_bills WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can create accounting bill payments"
  ON public.accounting_bill_payments FOR INSERT
  WITH CHECK (bill_id IN (
    SELECT id FROM public.accounting_bills WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  ));

-- Updated_at trigger
CREATE TRIGGER update_accounting_bills_updated_at
  BEFORE UPDATE ON public.accounting_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
