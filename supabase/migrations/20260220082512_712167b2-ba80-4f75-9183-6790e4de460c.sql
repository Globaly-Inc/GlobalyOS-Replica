
-- Phase 2: Journals, Journal Lines, Ledger Entries

-- Journal status enum
CREATE TYPE public.journal_status AS ENUM ('draft', 'posted', 'reversed');

-- Journals table
CREATE TABLE public.journals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  ledger_id UUID NOT NULL REFERENCES public.accounting_ledgers(id),
  office_id UUID NOT NULL REFERENCES public.offices(id),
  journal_number SERIAL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  status public.journal_status NOT NULL DEFAULT 'draft',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id UUID,
  is_adjusting BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journal lines table
CREATE TABLE public.journal_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  description TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate_id UUID REFERENCES public.tax_rates(id),
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  contact_id UUID REFERENCES public.accounting_contacts(id),
  sort_order INT NOT NULL DEFAULT 0
);

-- Ledger entries (append-only, created when journal is posted)
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  ledger_id UUID NOT NULL REFERENCES public.accounting_ledgers(id),
  office_id UUID NOT NULL REFERENCES public.offices(id),
  journal_id UUID NOT NULL REFERENCES public.journals(id),
  journal_line_id UUID NOT NULL REFERENCES public.journal_lines(id),
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  date DATE NOT NULL,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_delta NUMERIC(15,2) GENERATED ALWAYS AS (debit - credit) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_journals_org_ledger_office ON public.journals(organization_id, ledger_id, office_id, date);
CREATE INDEX idx_journals_status ON public.journals(status);
CREATE INDEX idx_journal_lines_journal ON public.journal_lines(journal_id);
CREATE INDEX idx_journal_lines_account ON public.journal_lines(account_id);
CREATE INDEX idx_ledger_entries_org_ledger_office_date ON public.ledger_entries(organization_id, ledger_id, office_id, date);
CREATE INDEX idx_ledger_entries_account ON public.ledger_entries(account_id);

-- RLS
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Journals: org members can read, admin/owner can write
CREATE POLICY "Users can view journals in their org"
  ON public.journals FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can create journals"
  ON public.journals FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update journals"
  ON public.journals FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Journal lines: accessible via journal org check
CREATE POLICY "Users can view journal lines in their org"
  ON public.journal_lines FOR SELECT
  USING (journal_id IN (
    SELECT id FROM public.journals WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can create journal lines"
  ON public.journal_lines FOR INSERT
  WITH CHECK (journal_id IN (
    SELECT id FROM public.journals WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  ));

CREATE POLICY "Admins can update journal lines"
  ON public.journal_lines FOR UPDATE
  USING (journal_id IN (
    SELECT id FROM public.journals WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  ));

-- Ledger entries: read-only for org members, insert by admins only
CREATE POLICY "Users can view ledger entries in their org"
  ON public.ledger_entries FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can create ledger entries"
  ON public.ledger_entries FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Validation function: ensure journal is balanced before posting
CREATE OR REPLACE FUNCTION public.validate_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debits NUMERIC;
  total_credits NUMERIC;
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO total_debits, total_credits
    FROM public.journal_lines
    WHERE journal_id = NEW.id;
    
    IF total_debits != total_credits THEN
      RAISE EXCEPTION 'Journal is not balanced: debits (%) != credits (%)', total_debits, total_credits;
    END IF;
    
    IF total_debits = 0 THEN
      RAISE EXCEPTION 'Journal has no lines';
    END IF;
    
    NEW.posted_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_journal_before_post
  BEFORE UPDATE ON public.journals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_journal_balance();

-- Function to create ledger entries when journal is posted
CREATE OR REPLACE FUNCTION public.create_ledger_entries_on_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    INSERT INTO public.ledger_entries (organization_id, ledger_id, office_id, journal_id, journal_line_id, account_id, date, debit, credit)
    SELECT NEW.organization_id, NEW.ledger_id, NEW.office_id, NEW.id, jl.id, jl.account_id, NEW.date, jl.debit, jl.credit
    FROM public.journal_lines jl
    WHERE jl.journal_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_ledger_entries_after_post
  AFTER UPDATE ON public.journals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ledger_entries_on_post();
