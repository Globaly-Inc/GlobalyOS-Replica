
-- ============================================================
-- Phase 1: CRM Services Marketplace + Partners + Agent Portal
-- ============================================================

-- Enums
CREATE TYPE public.crm_service_type AS ENUM ('direct', 'represented_provider', 'internal_only');
CREATE TYPE public.crm_service_visibility AS ENUM ('internal', 'client_portal', 'agent_portal', 'both_portals');
CREATE TYPE public.crm_service_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.crm_partner_type AS ENUM ('agent', 'provider', 'both');
CREATE TYPE public.crm_partner_contract_status AS ENUM ('active', 'inactive');
CREATE TYPE public.partner_user_status AS ENUM ('active', 'suspended', 'invited');
CREATE TYPE public.service_application_status AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'completed');
CREATE TYPE public.service_application_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.application_creator_type AS ENUM ('client', 'agent', 'staff');
CREATE TYPE public.application_doc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.application_task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.fee_revenue_type AS ENUM ('revenue_from_client', 'commission_from_partner');
CREATE TYPE public.fee_structure_type AS ENUM ('equal', 'custom');
CREATE TYPE public.installment_alias AS ENUM ('full_fee', 'per_year', 'per_month', 'per_week', 'per_term', 'per_semester', 'per_trimester');
CREATE TYPE public.fee_classification AS ENUM ('income', 'payable');
CREATE TYPE public.tax_mode AS ENUM ('inclusive', 'exclusive');
CREATE TYPE public.payment_schedule_type AS ENUM ('manual', 'auto');
CREATE TYPE public.payment_schedule_item_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.fee_activity_action AS ENUM ('created', 'updated', 'deleted');
CREATE TYPE public.ai_insight_type AS ENUM ('recommendation', 'doc_check', 'summary');

-- ============================================================
-- 1a. CRM Partners (must be created before crm_services FK)
-- ============================================================
CREATE TABLE public.crm_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type public.crm_partner_type NOT NULL DEFAULT 'agent',
  name TEXT NOT NULL,
  trading_name TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_postcode TEXT,
  address_country TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  contract_status public.crm_partner_contract_status NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  compliance_docs JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_partner_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.crm_partners(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 1a. CRM Services Catalog
-- ============================================================
CREATE TABLE public.crm_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  short_description TEXT,
  long_description TEXT,
  service_type public.crm_service_type NOT NULL DEFAULT 'direct',
  provider_partner_id UUID REFERENCES public.crm_partners(id) ON DELETE SET NULL,
  visibility public.crm_service_visibility NOT NULL DEFAULT 'internal',
  status public.crm_service_status NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  eligibility_notes TEXT,
  required_docs_template JSONB DEFAULT '[]'::jsonb,
  workflow_stages JSONB DEFAULT '[]'::jsonb,
  sla_target_days INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_service_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  UNIQUE(service_id, office_id)
);

-- ============================================================
-- 1b. Partner Users + Auth
-- ============================================================
CREATE TABLE public.partner_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.crm_partners(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  status public.partner_user_status NOT NULL DEFAULT 'invited',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

CREATE TABLE public.partner_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id UUID NOT NULL REFERENCES public.partner_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_user_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id UUID NOT NULL REFERENCES public.partner_users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 1b. Partner Customers
-- ============================================================
CREATE TABLE public.partner_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.crm_partners(id) ON DELETE CASCADE,
  partner_user_id UUID REFERENCES public.partner_users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  nationality TEXT,
  country_of_residency TEXT,
  linked_crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  notes TEXT,
  custom_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 1c. Service Applications
-- ============================================================
CREATE TABLE public.service_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.crm_services(id) ON DELETE RESTRICT,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  created_by_type public.application_creator_type NOT NULL DEFAULT 'staff',
  client_portal_user_id UUID REFERENCES public.client_portal_users(id) ON DELETE SET NULL,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  partner_customer_id UUID REFERENCES public.partner_customers(id) ON DELETE SET NULL,
  agent_partner_id UUID REFERENCES public.crm_partners(id) ON DELETE SET NULL,
  agent_user_id UUID REFERENCES public.partner_users(id) ON DELETE SET NULL,
  provider_partner_id UUID REFERENCES public.crm_partners(id) ON DELETE SET NULL,
  status public.service_application_status NOT NULL DEFAULT 'draft',
  priority public.service_application_priority NOT NULL DEFAULT 'medium',
  form_responses JSONB,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.service_application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.service_applications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.service_application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.service_applications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_type TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  status public.application_doc_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  review_notes TEXT,
  uploaded_by_type public.application_creator_type NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.service_application_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.service_applications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_type public.application_creator_type,
  assigned_to_id UUID,
  due_date DATE,
  status public.application_task_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.service_application_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.service_applications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_type public.application_creator_type NOT NULL,
  sender_id UUID,
  content TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 1d. Product Fee System
-- ============================================================
CREATE TABLE public.crm_product_fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_product_fee_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Fees',
  is_default BOOLEAN NOT NULL DEFAULT false,
  applicable_partner_branches JSONB,
  applicable_client_countries JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_product_fee_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fee_option_id UUID NOT NULL REFERENCES public.crm_product_fee_options(id) ON DELETE CASCADE,
  revenue_type public.fee_revenue_type NOT NULL,
  fee_structure_type public.fee_structure_type NOT NULL DEFAULT 'equal',
  installment_alias public.installment_alias NOT NULL DEFAULT 'full_fee',
  installment_name TEXT,
  installment_order INTEGER NOT NULL DEFAULT 0,
  fee_type_id UUID REFERENCES public.crm_product_fee_types(id) ON DELETE SET NULL,
  description VARCHAR(120),
  classification public.fee_classification,
  installment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  num_installments INTEGER,
  total_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  claimable_terms INTEGER,
  commission_percentage NUMERIC(5,2),
  commission_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.application_fee_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.service_applications(id) ON DELETE CASCADE,
  fee_option_id UUID REFERENCES public.crm_product_fee_options(id) ON DELETE SET NULL,
  overridden_items JSONB,
  tax_mode public.tax_mode DEFAULT 'exclusive',
  tax_rate_id UUID,
  discount_amount NUMERIC(12,2),
  discount_description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.service_applications(id) ON DELETE CASCADE,
  schedule_type public.payment_schedule_type NOT NULL DEFAULT 'manual',
  installment_start_date DATE,
  installment_interval TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.payment_schedules(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  installment_name TEXT,
  installment_type TEXT,
  is_claimable BOOLEAN DEFAULT false,
  installment_date DATE,
  invoice_date DATE,
  auto_invoicing BOOLEAN DEFAULT false,
  invoice_type TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  status public.payment_schedule_item_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 1e. Partner Promotions
-- ============================================================
CREATE TABLE public.partner_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.crm_partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  apply_to_all_products BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  attachments JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_promotion_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.partner_promotions(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.crm_partner_branches(id) ON DELETE SET NULL
);

-- ============================================================
-- 1f. Activity Logs
-- ============================================================
CREATE TABLE public.product_fee_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
  user_id UUID,
  action public.fee_activity_action NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 1g. AI Service Insights
-- ============================================================
CREATE TABLE public.ai_service_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_type public.ai_insight_type NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  input_data JSONB,
  output_data JSONB,
  confidence_score NUMERIC(3,2),
  created_by_type public.application_creator_type,
  created_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_crm_services_org ON public.crm_services(organization_id);
CREATE INDEX idx_crm_services_status ON public.crm_services(organization_id, status);
CREATE INDEX idx_crm_services_visibility ON public.crm_services(organization_id, visibility);
CREATE INDEX idx_crm_partners_org ON public.crm_partners(organization_id);
CREATE INDEX idx_crm_partners_type ON public.crm_partners(organization_id, type);
CREATE INDEX idx_partner_users_org ON public.partner_users(organization_id);
CREATE INDEX idx_partner_users_partner ON public.partner_users(partner_id);
CREATE INDEX idx_partner_customers_org ON public.partner_customers(organization_id);
CREATE INDEX idx_partner_customers_partner ON public.partner_customers(partner_id);
CREATE INDEX idx_service_applications_org ON public.service_applications(organization_id);
CREATE INDEX idx_service_applications_status ON public.service_applications(organization_id, status);
CREATE INDEX idx_service_applications_service ON public.service_applications(service_id);
CREATE INDEX idx_service_applications_agent ON public.service_applications(agent_partner_id);
CREATE INDEX idx_crm_product_fee_options_service ON public.crm_product_fee_options(service_id);
CREATE INDEX idx_crm_product_fee_items_option ON public.crm_product_fee_items(fee_option_id);
CREATE INDEX idx_partner_promotions_partner ON public.partner_promotions(partner_id);
CREATE INDEX idx_product_fee_activity_logs_service ON public.product_fee_activity_logs(service_id);
CREATE INDEX idx_ai_service_insights_entity ON public.ai_service_insights(entity_type, entity_id);

-- ============================================================
-- RLS Policies (org-scoped for internal staff)
-- ============================================================

-- Helper: check org membership via employees table
CREATE OR REPLACE FUNCTION public.is_org_member_via_employee(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- crm_services
ALTER TABLE public.crm_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view services" ON public.crm_services FOR SELECT TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can insert services" ON public.crm_services FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can update services" ON public.crm_services FOR UPDATE TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can delete services" ON public.crm_services FOR DELETE TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));

-- crm_service_offices
ALTER TABLE public.crm_service_offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage service offices" ON public.crm_service_offices FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- crm_partners
ALTER TABLE public.crm_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view partners" ON public.crm_partners FOR SELECT TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can insert partners" ON public.crm_partners FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can update partners" ON public.crm_partners FOR UPDATE TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can delete partners" ON public.crm_partners FOR DELETE TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));

-- crm_partner_branches
ALTER TABLE public.crm_partner_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage partner branches" ON public.crm_partner_branches FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- partner_users
ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage partner users" ON public.partner_users FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- partner_user_sessions (service role only - accessed via edge functions)
ALTER TABLE public.partner_user_sessions ENABLE ROW LEVEL SECURITY;

-- partner_user_otp_codes (service role only)
ALTER TABLE public.partner_user_otp_codes ENABLE ROW LEVEL SECURITY;

-- partner_customers
ALTER TABLE public.partner_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage partner customers" ON public.partner_customers FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- service_applications
ALTER TABLE public.service_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view applications" ON public.service_applications FOR SELECT TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can insert applications" ON public.service_applications FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can update applications" ON public.service_applications FOR UPDATE TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can delete applications" ON public.service_applications FOR DELETE TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));

-- service_application_status_history
ALTER TABLE public.service_application_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage status history" ON public.service_application_status_history FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- service_application_documents
ALTER TABLE public.service_application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage app docs" ON public.service_application_documents FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- service_application_tasks
ALTER TABLE public.service_application_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage app tasks" ON public.service_application_tasks FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- service_application_messages
ALTER TABLE public.service_application_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage app messages" ON public.service_application_messages FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- crm_product_fee_types
ALTER TABLE public.crm_product_fee_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view system fee types" ON public.crm_product_fee_types FOR SELECT TO authenticated
  USING (is_system = true OR public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can manage custom fee types" ON public.crm_product_fee_types FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can update fee types" ON public.crm_product_fee_types FOR UPDATE TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can delete fee types" ON public.crm_product_fee_types FOR DELETE TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id) AND is_system = false);

-- crm_product_fee_options
ALTER TABLE public.crm_product_fee_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage fee options" ON public.crm_product_fee_options FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- crm_product_fee_items
ALTER TABLE public.crm_product_fee_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage fee items" ON public.crm_product_fee_items FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- application_fee_overrides
ALTER TABLE public.application_fee_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage fee overrides" ON public.application_fee_overrides FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- payment_schedules
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage payment schedules" ON public.payment_schedules FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- payment_schedule_items
ALTER TABLE public.payment_schedule_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage schedule items" ON public.payment_schedule_items FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- partner_promotions
ALTER TABLE public.partner_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage promotions" ON public.partner_promotions FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- partner_promotion_products
ALTER TABLE public.partner_promotion_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage promotion products" ON public.partner_promotion_products FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_promotions pp
    WHERE pp.id = promotion_id
    AND public.is_org_member_via_employee(auth.uid(), pp.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.partner_promotions pp
    WHERE pp.id = promotion_id
    AND public.is_org_member_via_employee(auth.uid(), pp.organization_id)
  ));

-- product_fee_activity_logs
ALTER TABLE public.product_fee_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view fee activity logs" ON public.product_fee_activity_logs FOR SELECT TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id));
CREATE POLICY "Org members can insert fee activity logs" ON public.product_fee_activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- ai_service_insights
ALTER TABLE public.ai_service_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage AI insights" ON public.ai_service_insights FOR ALL TO authenticated
  USING (public.is_org_member_via_employee(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member_via_employee(auth.uid(), organization_id));

-- ============================================================
-- Seed: 29 predefined system fee types (org_id = NULL for system)
-- ============================================================
INSERT INTO public.crm_product_fee_types (name, is_system, organization_id) VALUES
  ('Tuition Fee', true, NULL),
  ('Application Fee', true, NULL),
  ('Registration Fee', true, NULL),
  ('Visa Fee', true, NULL),
  ('Accommodation Fee', true, NULL),
  ('Health Cover', true, NULL),
  ('Airport Pickup', true, NULL),
  ('Material Fee', true, NULL),
  ('Exam Fee', true, NULL),
  ('Insurance Fee', true, NULL),
  ('Technology Fee', true, NULL),
  ('Library Fee', true, NULL),
  ('Lab Fee', true, NULL),
  ('Activity Fee', true, NULL),
  ('Student Services Fee', true, NULL),
  ('Orientation Fee', true, NULL),
  ('Graduation Fee', true, NULL),
  ('Late Payment Fee', true, NULL),
  ('Instalment Fee', true, NULL),
  ('Transfer Fee', true, NULL),
  ('Cancellation Fee', true, NULL),
  ('Refund Processing Fee', true, NULL),
  ('Courier Fee', true, NULL),
  ('Translation Fee', true, NULL),
  ('Notarisation Fee', true, NULL),
  ('Guardianship Fee', true, NULL),
  ('Homestay Placement Fee', true, NULL),
  ('Work Permit Fee', true, NULL),
  ('Miscellaneous Fee', true, NULL);

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_crm_services_updated_at BEFORE UPDATE ON public.crm_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_partners_updated_at BEFORE UPDATE ON public.crm_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partner_users_updated_at BEFORE UPDATE ON public.partner_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partner_customers_updated_at BEFORE UPDATE ON public.partner_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_service_applications_updated_at BEFORE UPDATE ON public.service_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_service_application_tasks_updated_at BEFORE UPDATE ON public.service_application_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_product_fee_options_updated_at BEFORE UPDATE ON public.crm_product_fee_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_product_fee_items_updated_at BEFORE UPDATE ON public.crm_product_fee_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_application_fee_overrides_updated_at BEFORE UPDATE ON public.application_fee_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payment_schedules_updated_at BEFORE UPDATE ON public.payment_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payment_schedule_items_updated_at BEFORE UPDATE ON public.payment_schedule_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partner_promotions_updated_at BEFORE UPDATE ON public.partner_promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
