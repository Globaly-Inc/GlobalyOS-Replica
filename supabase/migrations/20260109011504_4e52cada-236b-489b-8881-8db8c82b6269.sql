-- Add columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_working_day DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS resignation_submitted_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_new_hire BOOLEAN DEFAULT true;

-- Monthly Proration Function
CREATE OR REPLACE FUNCTION calculate_prorated_leave_monthly(
  p_default_days NUMERIC, p_start_date DATE, p_end_date DATE
) RETURNS NUMERIC AS $$
DECLARE v_complete_months INTEGER;
BEGIN
  v_complete_months := (EXTRACT(YEAR FROM p_end_date) * 12 + EXTRACT(MONTH FROM p_end_date))
    - (EXTRACT(YEAR FROM p_start_date) * 12 + EXTRACT(MONTH FROM p_start_date));
  IF EXTRACT(DAY FROM p_start_date) > EXTRACT(DAY FROM p_end_date) THEN
    v_complete_months := v_complete_months - 1;
  END IF;
  v_complete_months := GREATEST(0, LEAST(12, v_complete_months + 1));
  RETURN ROUND((p_default_days::NUMERIC / 12) * v_complete_months, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create all workflow tables
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('onboarding', 'offboarding')),
  description TEXT, is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workflow_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, description TEXT,
  category TEXT NOT NULL CHECK (category IN ('documentation', 'equipment', 'training', 'access', 'exit_interview', 'asset_return', 'knowledge_transfer', 'other')),
  assignee_type TEXT NOT NULL CHECK (assignee_type IN ('employee', 'manager', 'hr', 'it', 'specific_person')),
  assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  due_days_offset INTEGER DEFAULT 0, is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE employee_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('onboarding', 'offboarding')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  start_date DATE NOT NULL, target_date DATE NOT NULL, completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE employee_workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES employee_workflows(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, description TEXT, category TEXT NOT NULL,
  assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  due_date DATE, is_required BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ, notes TEXT, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exit_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  workflow_id UUID REFERENCES employee_workflows(id) ON DELETE SET NULL,
  conducted_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  conducted_at TIMESTAMPTZ, reason_for_leaving TEXT,
  feedback_management TEXT, feedback_culture TEXT, feedback_role TEXT, feedback_compensation TEXT,
  suggestions TEXT, would_recommend BOOLEAN, would_return BOOLEAN,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  is_confidential BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE asset_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  workflow_id UUID REFERENCES employee_workflows(id) ON DELETE SET NULL,
  asset_name TEXT NOT NULL, asset_id TEXT,
  category TEXT DEFAULT 'hardware' CHECK (category IN ('hardware', 'software', 'access', 'documents', 'other')),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'returned', 'damaged', 'missing')),
  assigned_date DATE, returned_date DATE,
  verified_by UUID REFERENCES employees(id) ON DELETE SET NULL, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE knowledge_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  workflow_id UUID REFERENCES employee_workflows(id) ON DELETE SET NULL,
  topic TEXT NOT NULL, description TEXT,
  recipient_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  scheduled_date DATE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  wiki_page_id UUID, completed_at TIMESTAMPTZ, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_templates
CREATE POLICY "wt_select" ON workflow_templates FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "wt_insert" ON workflow_templates FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "wt_update" ON workflow_templates FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "wt_delete" ON workflow_templates FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- RLS Policies for workflow_template_tasks
CREATE POLICY "wtt_select" ON workflow_template_tasks FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "wtt_insert" ON workflow_template_tasks FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "wtt_update" ON workflow_template_tasks FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "wtt_delete" ON workflow_template_tasks FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- RLS Policies for employee_workflows
CREATE POLICY "ew_select" ON employee_workflows FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));
CREATE POLICY "ew_insert" ON employee_workflows FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "ew_update" ON employee_workflows FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "ew_delete" ON employee_workflows FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- RLS Policies for employee_workflow_tasks
CREATE POLICY "ewt_select" ON employee_workflow_tasks FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR assignee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));
CREATE POLICY "ewt_insert" ON employee_workflow_tasks FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "ewt_update" ON employee_workflow_tasks FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR assignee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));
CREATE POLICY "ewt_delete" ON employee_workflow_tasks FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- RLS Policies for exit_interviews
CREATE POLICY "ei_select" ON exit_interviews FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "ei_insert" ON exit_interviews FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "ei_update" ON exit_interviews FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "ei_delete" ON exit_interviews FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- RLS Policies for asset_handovers
CREATE POLICY "ah_select" ON asset_handovers FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));
CREATE POLICY "ah_insert" ON asset_handovers FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "ah_update" ON asset_handovers FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "ah_delete" ON asset_handovers FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- RLS Policies for knowledge_transfers
CREATE POLICY "kt_select" ON knowledge_transfers FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR recipient_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));
CREATE POLICY "kt_insert" ON knowledge_transfers FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "kt_update" ON knowledge_transfers FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "kt_delete" ON knowledge_transfers FOR DELETE TO authenticated USING (is_org_member(auth.uid(), organization_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- Indexes
CREATE INDEX idx_workflow_templates_org ON workflow_templates(organization_id, type);
CREATE INDEX idx_employee_workflows_emp ON employee_workflows(employee_id);
CREATE INDEX idx_employee_workflow_tasks_wf ON employee_workflow_tasks(workflow_id);
CREATE INDEX idx_employee_workflow_tasks_assignee ON employee_workflow_tasks(assignee_id, status);