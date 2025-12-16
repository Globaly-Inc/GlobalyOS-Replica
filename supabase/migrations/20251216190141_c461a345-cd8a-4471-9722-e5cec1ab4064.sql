-- =============================================
-- PAYROLL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =============================================

-- 1. Legal Entities (Organizations can have multiple legal entities in different countries)
CREATE TABLE public.legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('NP', 'IN', 'AU')), -- Nepal, India, Australia
  registration_number TEXT,
  tax_id TEXT,
  address JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Payroll Profiles (Configuration per legal entity)
CREATE TABLE public.payroll_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL REFERENCES public.legal_entities(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('NP', 'IN', 'AU')),
  currency TEXT NOT NULL DEFAULT 'NPR' CHECK (currency IN ('NPR', 'INR', 'AUD')),
  pay_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (pay_frequency IN ('monthly', 'fortnightly', 'weekly')),
  standard_hours_per_week NUMERIC NOT NULL DEFAULT 40,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kathmandu',
  is_default BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Employee Bank Accounts
CREATE TABLE public.employee_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  routing_code TEXT, -- BSB (AU), IFSC (IN), SWIFT
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Salary Structures (versioned per employee)
CREATE TABLE public.salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  base_salary_amount NUMERIC NOT NULL CHECK (base_salary_amount >= 0),
  salary_period TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_period IN ('monthly', 'annual')),
  salary_type TEXT NOT NULL DEFAULT 'gross' CHECK (salary_type IN ('ctc', 'gross', 'net')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Salary Components (earnings/deductions/bonuses attached to salary structure)
CREATE TABLE public.salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN ('earning', 'deduction', 'bonus')),
  name TEXT NOT NULL,
  calculation_method TEXT NOT NULL CHECK (calculation_method IN ('fixed_amount', 'percentage_of_base', 'formula')),
  value NUMERIC NOT NULL,
  formula TEXT, -- For formula-based calculations
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  is_pf_applicable BOOLEAN NOT NULL DEFAULT false,
  is_ssf_applicable BOOLEAN NOT NULL DEFAULT false,
  is_super_applicable BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tax Slabs (country-specific, date-versioned)
CREATE TABLE public.tax_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL CHECK (country IN ('NP', 'IN', 'AU')),
  payroll_profile_id UUID REFERENCES public.payroll_profiles(id) ON DELETE CASCADE, -- null = global default
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  slab_min NUMERIC NOT NULL CHECK (slab_min >= 0),
  slab_max NUMERIC, -- null = unlimited
  rate_percent NUMERIC NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
  metadata JSONB, -- marital status, regime (new/old for India), etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_slab_range CHECK (slab_max IS NULL OR slab_max > slab_min)
);

-- 7. Social Security Rules (PF, SSF, SG, ESI)
CREATE TABLE public.social_security_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL CHECK (country IN ('NP', 'IN', 'AU')),
  payroll_profile_id UUID REFERENCES public.payroll_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('pf', 'ssf', 'sg', 'esi', 'gratuity')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  employee_rate_percent NUMERIC NOT NULL DEFAULT 0 CHECK (employee_rate_percent >= 0),
  employer_rate_percent NUMERIC NOT NULL DEFAULT 0 CHECK (employer_rate_percent >= 0),
  base_type TEXT NOT NULL DEFAULT 'basic_salary' CHECK (base_type IN ('basic_salary', 'gross', 'ote')),
  caps JSONB, -- max contribution limits
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Statutory Rules (overtime, min wage, bonus, PT)
CREATE TABLE public.statutory_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL CHECK (country IN ('NP', 'IN', 'AU')),
  payroll_profile_id UUID REFERENCES public.payroll_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('overtime', 'min_wage', 'bonus', 'pt', 'gratuity', 'leave_encashment')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  config JSONB NOT NULL, -- thresholds, multipliers, state-specific values
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Payroll Runs
CREATE TABLE public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_profile_id UUID NOT NULL REFERENCES public.payroll_profiles(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'locked')),
  summary_totals JSONB, -- cached totals for quick display
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_pay_date CHECK (pay_date >= period_end),
  UNIQUE(payroll_profile_id, period_start, period_end)
);

-- 10. Payroll Run Items (per employee calculation results)
CREATE TABLE public.payroll_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  gross_earnings NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  employer_contributions_total NUMERIC NOT NULL DEFAULT 0,
  net_pay NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  calculation_snapshot JSONB, -- full breakdown for audit trail
  has_manual_adjustment BOOLEAN NOT NULL DEFAULT false,
  adjustment_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);

-- 11. Payroll Earnings (line items for each run item)
CREATE TABLE public.payroll_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_item_id UUID NOT NULL REFERENCES public.payroll_run_items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  earning_type TEXT NOT NULL CHECK (earning_type IN ('basic', 'allowance', 'overtime', 'bonus', 'incentive', 'commission', 'reimbursement', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Payroll Deductions (line items for each run item)
CREATE TABLE public.payroll_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_item_id UUID NOT NULL REFERENCES public.payroll_run_items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('tax', 'pf', 'ssf', 'esi', 'pt', 'unpaid_leave', 'advance', 'loan', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Employer Contributions (not deducted from employee pay)
CREATE TABLE public.employer_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_item_id UUID NOT NULL REFERENCES public.payroll_run_items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('pf_employer', 'ssf_employer', 'sg', 'esi_employer', 'gratuity', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Payslips
CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_item_id UUID NOT NULL REFERENCES public.payroll_run_items(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payslip_number TEXT NOT NULL UNIQUE, -- Public ID e.g. PS-2025-001234
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  emailed_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Extend employees table for payroll fields
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS legal_entity_id UUID REFERENCES public.legal_entities(id),
  ADD COLUMN IF NOT EXISTS payroll_profile_id UUID REFERENCES public.payroll_profiles(id),
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contractor', 'casual')),
  ADD COLUMN IF NOT EXISTS tax_profile JSONB; -- PAN (NP/IN), TFN (AU), regime, marital status, etc.

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_legal_entities_org ON public.legal_entities(organization_id);
CREATE INDEX idx_legal_entities_country ON public.legal_entities(country);

CREATE INDEX idx_payroll_profiles_org ON public.payroll_profiles(organization_id);
CREATE INDEX idx_payroll_profiles_legal_entity ON public.payroll_profiles(legal_entity_id);
CREATE INDEX idx_payroll_profiles_country ON public.payroll_profiles(country);

CREATE INDEX idx_employee_bank_accounts_employee ON public.employee_bank_accounts(employee_id);
CREATE INDEX idx_employee_bank_accounts_org ON public.employee_bank_accounts(organization_id);

CREATE INDEX idx_salary_structures_employee ON public.salary_structures(employee_id);
CREATE INDEX idx_salary_structures_org ON public.salary_structures(organization_id);
CREATE INDEX idx_salary_structures_effective ON public.salary_structures(effective_from, effective_to);

CREATE INDEX idx_salary_components_structure ON public.salary_components(salary_structure_id);
CREATE INDEX idx_salary_components_org ON public.salary_components(organization_id);

CREATE INDEX idx_tax_slabs_country ON public.tax_slabs(country);
CREATE INDEX idx_tax_slabs_profile ON public.tax_slabs(payroll_profile_id);
CREATE INDEX idx_tax_slabs_effective ON public.tax_slabs(effective_from, effective_to);

CREATE INDEX idx_social_security_rules_country ON public.social_security_rules(country);
CREATE INDEX idx_social_security_rules_profile ON public.social_security_rules(payroll_profile_id);

CREATE INDEX idx_statutory_rules_country ON public.statutory_rules(country);
CREATE INDEX idx_statutory_rules_profile ON public.statutory_rules(payroll_profile_id);

CREATE INDEX idx_payroll_runs_org ON public.payroll_runs(organization_id);
CREATE INDEX idx_payroll_runs_profile ON public.payroll_runs(payroll_profile_id);
CREATE INDEX idx_payroll_runs_status ON public.payroll_runs(status);
CREATE INDEX idx_payroll_runs_period ON public.payroll_runs(period_start, period_end);

CREATE INDEX idx_payroll_run_items_run ON public.payroll_run_items(payroll_run_id);
CREATE INDEX idx_payroll_run_items_employee ON public.payroll_run_items(employee_id);
CREATE INDEX idx_payroll_run_items_org ON public.payroll_run_items(organization_id);

CREATE INDEX idx_payroll_earnings_run_item ON public.payroll_earnings(run_item_id);
CREATE INDEX idx_payroll_deductions_run_item ON public.payroll_deductions(run_item_id);
CREATE INDEX idx_employer_contributions_run_item ON public.employer_contributions(run_item_id);

CREATE INDEX idx_payslips_employee ON public.payslips(employee_id);
CREATE INDEX idx_payslips_org ON public.payslips(organization_id);
CREATE INDEX idx_payslips_run_item ON public.payslips(payroll_run_item_id);

CREATE INDEX idx_employees_legal_entity ON public.employees(legal_entity_id);
CREATE INDEX idx_employees_payroll_profile ON public.employees(payroll_profile_id);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Legal Entities
CREATE POLICY "Org members can view legal entities"
  ON public.legal_entities FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage legal entities"
  ON public.legal_entities FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(auth.uid(), organization_id));

-- Payroll Profiles
CREATE POLICY "Org members can view payroll profiles"
  ON public.payroll_profiles FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins and HR can manage payroll profiles"
  ON public.payroll_profiles FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- Employee Bank Accounts
CREATE POLICY "Users can view own bank accounts"
  ON public.employee_bank_accounts FOR SELECT
  USING (is_own_employee(employee_id));

CREATE POLICY "HR and admins can view all bank accounts"
  ON public.employee_bank_accounts FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage bank accounts"
  ON public.employee_bank_accounts FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage own bank accounts"
  ON public.employee_bank_accounts FOR ALL
  USING (is_own_employee(employee_id))
  WITH CHECK (is_own_employee(employee_id));

-- Salary Structures
CREATE POLICY "Users can view own salary structures"
  ON public.salary_structures FOR SELECT
  USING (is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports salary structures"
  ON public.salary_structures FOR SELECT
  USING (is_manager_of_employee(employee_id));

CREATE POLICY "HR and admins can view all salary structures"
  ON public.salary_structures FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage salary structures"
  ON public.salary_structures FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- Salary Components
CREATE POLICY "Users can view own salary components"
  ON public.salary_components FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.salary_structures ss 
    WHERE ss.id = salary_components.salary_structure_id 
    AND is_own_employee(ss.employee_id)
  ));

CREATE POLICY "HR and admins can view all salary components"
  ON public.salary_components FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage salary components"
  ON public.salary_components FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- Tax Slabs (global defaults viewable by all, org-specific by org members)
CREATE POLICY "Anyone can view global tax slabs"
  ON public.tax_slabs FOR SELECT
  USING (organization_id IS NULL);

CREATE POLICY "Org members can view org tax slabs"
  ON public.tax_slabs FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage tax slabs"
  ON public.tax_slabs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND (organization_id IS NULL OR is_org_member(auth.uid(), organization_id)))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND (organization_id IS NULL OR is_org_member(auth.uid(), organization_id)));

CREATE POLICY "Super admins can manage global tax slabs"
  ON public.tax_slabs FOR ALL
  USING (is_super_admin() AND organization_id IS NULL)
  WITH CHECK (is_super_admin() AND organization_id IS NULL);

-- Social Security Rules
CREATE POLICY "Anyone can view global social security rules"
  ON public.social_security_rules FOR SELECT
  USING (organization_id IS NULL);

CREATE POLICY "Org members can view org social security rules"
  ON public.social_security_rules FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage social security rules"
  ON public.social_security_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND (organization_id IS NULL OR is_org_member(auth.uid(), organization_id)))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND (organization_id IS NULL OR is_org_member(auth.uid(), organization_id)));

CREATE POLICY "Super admins can manage global social security rules"
  ON public.social_security_rules FOR ALL
  USING (is_super_admin() AND organization_id IS NULL)
  WITH CHECK (is_super_admin() AND organization_id IS NULL);

-- Statutory Rules
CREATE POLICY "Anyone can view global statutory rules"
  ON public.statutory_rules FOR SELECT
  USING (organization_id IS NULL);

CREATE POLICY "Org members can view org statutory rules"
  ON public.statutory_rules FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage statutory rules"
  ON public.statutory_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND (organization_id IS NULL OR is_org_member(auth.uid(), organization_id)))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND (organization_id IS NULL OR is_org_member(auth.uid(), organization_id)));

CREATE POLICY "Super admins can manage global statutory rules"
  ON public.statutory_rules FOR ALL
  USING (is_super_admin() AND organization_id IS NULL)
  WITH CHECK (is_super_admin() AND organization_id IS NULL);

-- Payroll Runs
CREATE POLICY "HR and admins can view payroll runs"
  ON public.payroll_runs FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage payroll runs"
  ON public.payroll_runs FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Super admins can view all payroll runs"
  ON public.payroll_runs FOR SELECT
  USING (is_super_admin());

-- Payroll Run Items
CREATE POLICY "Users can view own payroll run items"
  ON public.payroll_run_items FOR SELECT
  USING (is_own_employee(employee_id));

CREATE POLICY "HR and admins can view all payroll run items"
  ON public.payroll_run_items FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage payroll run items"
  ON public.payroll_run_items FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- Payroll Earnings
CREATE POLICY "Users can view own payroll earnings"
  ON public.payroll_earnings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payroll_run_items pri 
    WHERE pri.id = payroll_earnings.run_item_id 
    AND is_own_employee(pri.employee_id)
  ));

CREATE POLICY "HR and admins can view all payroll earnings"
  ON public.payroll_earnings FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage payroll earnings"
  ON public.payroll_earnings FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- Payroll Deductions
CREATE POLICY "Users can view own payroll deductions"
  ON public.payroll_deductions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payroll_run_items pri 
    WHERE pri.id = payroll_deductions.run_item_id 
    AND is_own_employee(pri.employee_id)
  ));

CREATE POLICY "HR and admins can view all payroll deductions"
  ON public.payroll_deductions FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage payroll deductions"
  ON public.payroll_deductions FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- Employer Contributions
CREATE POLICY "Users can view own employer contributions"
  ON public.employer_contributions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payroll_run_items pri 
    WHERE pri.id = employer_contributions.run_item_id 
    AND is_own_employee(pri.employee_id)
  ));

CREATE POLICY "HR and admins can view all employer contributions"
  ON public.employer_contributions FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage employer contributions"
  ON public.employer_contributions FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- Payslips
CREATE POLICY "Users can view own payslips"
  ON public.payslips FOR SELECT
  USING (is_own_employee(employee_id));

CREATE POLICY "HR and admins can view all payslips"
  ON public.payslips FOR SELECT
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage payslips"
  ON public.payslips FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'owner'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_legal_entities_updated_at
  BEFORE UPDATE ON public.legal_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_profiles_updated_at
  BEFORE UPDATE ON public.payroll_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_bank_accounts_updated_at
  BEFORE UPDATE ON public.employee_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salary_structures_updated_at
  BEFORE UPDATE ON public.salary_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_run_items_updated_at
  BEFORE UPDATE ON public.payroll_run_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();