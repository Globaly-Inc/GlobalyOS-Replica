
-- =============================================
-- CRM Pipeline Management System - Full Schema
-- =============================================

-- 1. Enums
CREATE TYPE public.crm_pipeline_stage_type AS ENUM ('normal', 'win');
CREATE TYPE public.crm_deal_status AS ENUM ('active', 'won', 'lost', 'cancelled');
CREATE TYPE public.crm_deal_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.crm_deal_source AS ENUM ('staff', 'agent', 'client_portal', 'form');
CREATE TYPE public.crm_requirement_type AS ENUM ('task', 'document', 'field', 'form', 'note_question');
CREATE TYPE public.crm_target_role AS ENUM ('assignee', 'contact', 'agent');
CREATE TYPE public.crm_requirement_status AS ENUM ('pending', 'completed', 'skipped', 'waived');
CREATE TYPE public.crm_deal_task_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
CREATE TYPE public.crm_deal_doc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.crm_deal_fee_status AS ENUM ('pending', 'invoiced', 'paid', 'waived');
CREATE TYPE public.crm_instalment_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE public.crm_actor_type AS ENUM ('staff', 'agent', 'contact', 'system');

-- 2. Core tables

-- crm_pipelines
CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  service_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_pipeline_stages
CREATE TABLE public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#6366f1',
  sort_order integer NOT NULL DEFAULT 0,
  stage_type public.crm_pipeline_stage_type NOT NULL DEFAULT 'normal',
  auto_advance boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_stage_requirements
CREATE TABLE public.crm_stage_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requirement_type public.crm_requirement_type NOT NULL,
  title text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  target_role public.crm_target_role NOT NULL DEFAULT 'assignee',
  config jsonb DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- crm_deals
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE RESTRICT,
  current_stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  agent_partner_id uuid REFERENCES public.crm_partners(id) ON DELETE SET NULL,
  agent_user_id uuid REFERENCES public.partner_users(id) ON DELETE SET NULL,
  title text NOT NULL,
  status public.crm_deal_status NOT NULL DEFAULT 'active',
  priority public.crm_deal_priority NOT NULL DEFAULT 'medium',
  lost_reason text,
  lost_notes text,
  expected_close_date date,
  actual_close_date date,
  deal_value numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  source public.crm_deal_source NOT NULL DEFAULT 'staff',
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_deal_services (junction)
CREATE TABLE public.crm_deal_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, service_id)
);

-- crm_deal_requirements
CREATE TABLE public.crm_deal_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  stage_requirement_id uuid NOT NULL REFERENCES public.crm_stage_requirements(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status public.crm_requirement_status NOT NULL DEFAULT 'pending',
  completed_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  completed_at timestamptz,
  response_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_deal_notes
CREATE TABLE public.crm_deal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_type public.crm_actor_type NOT NULL DEFAULT 'staff',
  author_id uuid,
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  requirement_id uuid REFERENCES public.crm_stage_requirements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- crm_deal_documents
CREATE TABLE public.crm_deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.crm_stage_requirements(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by_type public.crm_actor_type NOT NULL DEFAULT 'staff',
  uploaded_by uuid,
  status public.crm_deal_doc_status NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- crm_deal_tasks
CREATE TABLE public.crm_deal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  requirement_id uuid REFERENCES public.crm_stage_requirements(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assignee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  target_role public.crm_target_role NOT NULL DEFAULT 'assignee',
  status public.crm_deal_task_status NOT NULL DEFAULT 'pending',
  due_date date,
  completed_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_deal_activity_log
CREATE TABLE public.crm_deal_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  actor_type public.crm_actor_type NOT NULL DEFAULT 'system',
  actor_id uuid,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- crm_deal_fees
CREATE TABLE public.crm_deal_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fee_name text NOT NULL,
  fee_option_id uuid REFERENCES public.crm_product_fee_options(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  status public.crm_deal_fee_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crm_deal_fee_instalments
CREATE TABLE public.crm_deal_fee_instalments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_fee_id uuid NOT NULL REFERENCES public.crm_deal_fees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instalment_number integer NOT NULL DEFAULT 1,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status public.crm_instalment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_crm_pipelines_org ON public.crm_pipelines(organization_id);
CREATE INDEX idx_crm_pipeline_stages_pipeline ON public.crm_pipeline_stages(pipeline_id, sort_order);
CREATE INDEX idx_crm_pipeline_stages_org ON public.crm_pipeline_stages(organization_id);
CREATE INDEX idx_crm_stage_requirements_stage ON public.crm_stage_requirements(stage_id, sort_order);
CREATE INDEX idx_crm_stage_requirements_org ON public.crm_stage_requirements(organization_id);
CREATE INDEX idx_crm_deals_org_pipeline ON public.crm_deals(organization_id, pipeline_id);
CREATE INDEX idx_crm_deals_org_status ON public.crm_deals(organization_id, status);
CREATE INDEX idx_crm_deals_org_contact ON public.crm_deals(organization_id, contact_id);
CREATE INDEX idx_crm_deals_org_assignee ON public.crm_deals(organization_id, assignee_id);
CREATE INDEX idx_crm_deals_org_agent ON public.crm_deals(organization_id, agent_partner_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(current_stage_id);
CREATE INDEX idx_crm_deal_services_deal ON public.crm_deal_services(deal_id);
CREATE INDEX idx_crm_deal_requirements_deal ON public.crm_deal_requirements(deal_id, stage_requirement_id);
CREATE INDEX idx_crm_deal_notes_deal ON public.crm_deal_notes(deal_id, created_at DESC);
CREATE INDEX idx_crm_deal_documents_deal ON public.crm_deal_documents(deal_id);
CREATE INDEX idx_crm_deal_tasks_deal ON public.crm_deal_tasks(deal_id, sort_order);
CREATE INDEX idx_crm_deal_activity_deal ON public.crm_deal_activity_log(deal_id, created_at DESC);
CREATE INDEX idx_crm_deal_fees_deal ON public.crm_deal_fees(deal_id);
CREATE INDEX idx_crm_deal_fee_instalments_fee ON public.crm_deal_fee_instalments(deal_fee_id);

-- 4. Updated_at triggers
CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_crm_pipelines_updated_at BEFORE UPDATE ON public.crm_pipelines FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
CREATE TRIGGER trg_crm_pipeline_stages_updated_at BEFORE UPDATE ON public.crm_pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
CREATE TRIGGER trg_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
CREATE TRIGGER trg_crm_deal_requirements_updated_at BEFORE UPDATE ON public.crm_deal_requirements FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
CREATE TRIGGER trg_crm_deal_tasks_updated_at BEFORE UPDATE ON public.crm_deal_tasks FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
CREATE TRIGGER trg_crm_deal_fees_updated_at BEFORE UPDATE ON public.crm_deal_fees FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

-- 5. RLS - Enable on all tables
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stage_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_fee_instalments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Helper: All org-scoped tables use is_org_member for read, role checks for write

-- == crm_pipelines ==
CREATE POLICY "crm_pipelines_select" ON public.crm_pipelines FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_pipelines_insert" ON public.crm_pipelines FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_pipelines_update" ON public.crm_pipelines FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_pipelines_delete" ON public.crm_pipelines FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_pipelines_deny_anon" ON public.crm_pipelines AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_pipeline_stages ==
CREATE POLICY "crm_pipeline_stages_select" ON public.crm_pipeline_stages FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_pipeline_stages_insert" ON public.crm_pipeline_stages FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_pipeline_stages_update" ON public.crm_pipeline_stages FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_pipeline_stages_delete" ON public.crm_pipeline_stages FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_pipeline_stages_deny_anon" ON public.crm_pipeline_stages AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_stage_requirements ==
CREATE POLICY "crm_stage_requirements_select" ON public.crm_stage_requirements FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_stage_requirements_insert" ON public.crm_stage_requirements FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_stage_requirements_update" ON public.crm_stage_requirements FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_stage_requirements_delete" ON public.crm_stage_requirements FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_stage_requirements_deny_anon" ON public.crm_stage_requirements AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deals ==
CREATE POLICY "crm_deals_select" ON public.crm_deals FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deals_insert" ON public.crm_deals FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deals_update" ON public.crm_deals FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deals_delete" ON public.crm_deals FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_deals_deny_anon" ON public.crm_deals AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deal_services ==
CREATE POLICY "crm_deal_services_select" ON public.crm_deal_services FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_services_insert" ON public.crm_deal_services FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_services_update" ON public.crm_deal_services FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_services_delete" ON public.crm_deal_services FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_services_deny_anon" ON public.crm_deal_services AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deal_requirements ==
CREATE POLICY "crm_deal_requirements_select" ON public.crm_deal_requirements FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_requirements_insert" ON public.crm_deal_requirements FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_requirements_update" ON public.crm_deal_requirements FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_requirements_delete" ON public.crm_deal_requirements FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_requirements_deny_anon" ON public.crm_deal_requirements AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deal_notes ==
CREATE POLICY "crm_deal_notes_select" ON public.crm_deal_notes FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_notes_insert" ON public.crm_deal_notes FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_notes_delete" ON public.crm_deal_notes FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));
CREATE POLICY "crm_deal_notes_deny_anon" ON public.crm_deal_notes AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deal_documents ==
CREATE POLICY "crm_deal_documents_select" ON public.crm_deal_documents FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_documents_insert" ON public.crm_deal_documents FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_documents_update" ON public.crm_deal_documents FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_documents_delete" ON public.crm_deal_documents FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_documents_deny_anon" ON public.crm_deal_documents AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deal_tasks ==
CREATE POLICY "crm_deal_tasks_select" ON public.crm_deal_tasks FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_tasks_insert" ON public.crm_deal_tasks FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_tasks_update" ON public.crm_deal_tasks FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_tasks_delete" ON public.crm_deal_tasks FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_tasks_deny_anon" ON public.crm_deal_tasks AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deal_activity_log ==
CREATE POLICY "crm_deal_activity_log_select" ON public.crm_deal_activity_log FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_activity_log_insert" ON public.crm_deal_activity_log FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_activity_log_deny_anon" ON public.crm_deal_activity_log AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deal_fees ==
CREATE POLICY "crm_deal_fees_select" ON public.crm_deal_fees FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_fees_insert" ON public.crm_deal_fees FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_fees_update" ON public.crm_deal_fees FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_fees_delete" ON public.crm_deal_fees FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_fees_deny_anon" ON public.crm_deal_fees AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- == crm_deal_fee_instalments ==
CREATE POLICY "crm_deal_fee_instalments_select" ON public.crm_deal_fee_instalments FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_fee_instalments_insert" ON public.crm_deal_fee_instalments FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_fee_instalments_update" ON public.crm_deal_fee_instalments FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_fee_instalments_delete" ON public.crm_deal_fee_instalments FOR DELETE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "crm_deal_fee_instalments_deny_anon" ON public.crm_deal_fee_instalments AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 7. Storage bucket for deal documents
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-documents', 'deal-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "deal_docs_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deal-documents');
CREATE POLICY "deal_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deal-documents');
CREATE POLICY "deal_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deal-documents');

-- 8. Enable realtime for deals (for kanban live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_deal_tasks;
