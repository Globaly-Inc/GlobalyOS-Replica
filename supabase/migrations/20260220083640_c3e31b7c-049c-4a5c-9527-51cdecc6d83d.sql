
-- Phase 5: Banking - Bank Accounts, Statements, Statement Lines, Rules

-- Statement line status enum
CREATE TYPE public.bank_statement_line_status AS ENUM ('unmatched', 'matched', 'reconciled', 'excluded');

-- Bank accounts
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  ledger_id UUID NOT NULL REFERENCES public.accounting_ledgers(id),
  office_id UUID NOT NULL REFERENCES public.offices(id),
  name TEXT NOT NULL,
  account_number TEXT,
  bsb TEXT,
  bank_name TEXT,
  currency TEXT NOT NULL DEFAULT 'AUD',
  chart_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank statements
CREATE TABLE public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  import_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_date DATE,
  end_date DATE,
  row_count INT NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank statement lines
CREATE TABLE public.bank_statement_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  balance NUMERIC(15,2),
  reference TEXT,
  payee TEXT,
  status public.bank_statement_line_status NOT NULL DEFAULT 'unmatched',
  matched_journal_id UUID REFERENCES public.journals(id),
  matched_invoice_id UUID REFERENCES public.accounting_invoices(id),
  matched_bill_id UUID REFERENCES public.accounting_bills(id),
  categorized_account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank rules
CREATE TABLE public.bank_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  ledger_id UUID NOT NULL REFERENCES public.accounting_ledgers(id),
  office_id UUID REFERENCES public.offices(id),
  name TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_add BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bank_accounts_org_ledger ON public.bank_accounts(organization_id, ledger_id);
CREATE INDEX idx_bank_statements_account ON public.bank_statements(bank_account_id);
CREATE INDEX idx_bank_statement_lines_statement ON public.bank_statement_lines(statement_id);
CREATE INDEX idx_bank_statement_lines_status ON public.bank_statement_lines(status);
CREATE INDEX idx_bank_rules_org_ledger ON public.bank_rules(organization_id, ledger_id);

-- RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_rules ENABLE ROW LEVEL SECURITY;

-- Bank accounts RLS
CREATE POLICY "Users can view bank accounts in their org"
  ON public.bank_accounts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Bank statements RLS
CREATE POLICY "Users can view bank statements"
  ON public.bank_statements FOR SELECT
  USING (bank_account_id IN (
    SELECT id FROM public.bank_accounts WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage bank statements"
  ON public.bank_statements FOR ALL
  USING (bank_account_id IN (
    SELECT id FROM public.bank_accounts WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  ));

-- Bank statement lines RLS
CREATE POLICY "Users can view bank statement lines"
  ON public.bank_statement_lines FOR SELECT
  USING (statement_id IN (
    SELECT id FROM public.bank_statements WHERE bank_account_id IN (
      SELECT id FROM public.bank_accounts WHERE organization_id IN (
        SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Admins can manage bank statement lines"
  ON public.bank_statement_lines FOR ALL
  USING (statement_id IN (
    SELECT id FROM public.bank_statements WHERE bank_account_id IN (
      SELECT id FROM public.bank_accounts WHERE organization_id IN (
        SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  ));

-- Bank rules RLS
CREATE POLICY "Users can view bank rules in their org"
  ON public.bank_rules FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage bank rules"
  ON public.bank_rules FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
