-- Hiring & Recruitment Module Schema
-- Phase 1: Foundation Tables

-- ============================================
-- ENUM TYPES
-- ============================================

-- Job status enum
CREATE TYPE public.job_status AS ENUM (
  'draft',
  'submitted', 
  'approved',
  'open',
  'paused',
  'closed'
);

-- Work model enum
CREATE TYPE public.work_model AS ENUM (
  'onsite',
  'hybrid',
  'remote'
);

-- Employment type enum  
CREATE TYPE public.hiring_employment_type AS ENUM (
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary'
);

-- Candidate source enum
CREATE TYPE public.candidate_source AS ENUM (
  'careers_site',
  'internal',
  'referral',
  'manual',
  'job_board',
  'linkedin',
  'other'
);

-- Application stage enum
CREATE TYPE public.application_stage AS ENUM (
  'applied',
  'screening',
  'assignment',
  'interview_1',
  'interview_2',
  'interview_3',
  'offer',
  'hired',
  'rejected'
);

-- Application status enum
CREATE TYPE public.application_status AS ENUM (
  'active',
  'on_hold',
  'withdrawn',
  'rejected',
  'hired'
);

-- Assignment type enum
CREATE TYPE public.assignment_type AS ENUM (
  'coding',
  'writing',
  'design',
  'case_study',
  'general'
);

-- Assignment status enum
CREATE TYPE public.assignment_status AS ENUM (
  'assigned',
  'in_progress',
  'submitted',
  'overdue',
  'reviewed'
);

-- Interview status enum
CREATE TYPE public.interview_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

-- Interview recommendation enum
CREATE TYPE public.interview_recommendation AS ENUM (
  'strong_yes',
  'yes',
  'neutral',
  'no',
  'strong_no'
);

-- Offer status enum
CREATE TYPE public.offer_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'accepted',
  'declined',
  'expired'
);

-- Hiring activity action enum
CREATE TYPE public.hiring_activity_action AS ENUM (
  'job_created',
  'job_submitted',
  'job_approved',
  'job_published',
  'job_paused',
  'job_closed',
  'candidate_created',
  'application_created',
  'stage_changed',
  'assignment_assigned',
  'assignment_submitted',
  'assignment_reviewed',
  'interview_scheduled',
  'interview_completed',
  'scorecard_submitted',
  'offer_created',
  'offer_approved',
  'offer_sent',
  'offer_accepted',
  'offer_declined',
  'hired',
  'email_sent',
  'note_added'
);

-- ============================================
-- TABLES
-- ============================================

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  location TEXT,
  work_model public.work_model DEFAULT 'onsite',
  employment_type public.hiring_employment_type DEFAULT 'full_time',
  headcount INTEGER DEFAULT 1,
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  salary_currency TEXT DEFAULT 'USD',
  salary_visible BOOLEAN DEFAULT false,
  salary_visible_internal BOOLEAN DEFAULT true,
  hiring_manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  recruiter_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  description TEXT,
  requirements TEXT,
  benefits TEXT,
  target_start_date DATE,
  justification TEXT,
  status public.job_status DEFAULT 'draft',
  is_internal_visible BOOLEAN DEFAULT false,
  is_public_visible BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_reason TEXT,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- Job stages (configurable per job)
CREATE TABLE public.job_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage_key public.application_stage NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  other_urls JSONB DEFAULT '[]'::jsonb,
  source public.candidate_source DEFAULT 'careers_site',
  source_details TEXT,
  tags TEXT[] DEFAULT '{}',
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Candidate applications table
CREATE TABLE public.candidate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  stage public.application_stage DEFAULT 'applied',
  status public.application_status DEFAULT 'active',
  cv_file_path TEXT,
  cover_letter TEXT,
  application_answers JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  is_internal BOOLEAN DEFAULT false,
  source_of_application TEXT,
  rating NUMERIC(2,1),
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  hired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignment templates (org-level reusable)
CREATE TABLE public.assignment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.assignment_type DEFAULT 'general',
  role_tags TEXT[] DEFAULT '{}',
  instructions TEXT NOT NULL,
  expected_deliverables JSONB DEFAULT '{"files": false, "text_questions": [], "url_fields": []}'::jsonb,
  recommended_effort TEXT,
  default_deadline_hours INTEGER DEFAULT 72,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignment instances (per candidate application)
CREATE TABLE public.assignment_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.assignment_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  expected_deliverables JSONB DEFAULT '{"files": false, "text_questions": [], "url_fields": []}'::jsonb,
  deadline TIMESTAMPTZ NOT NULL,
  status public.assignment_status DEFAULT 'assigned',
  secure_token TEXT NOT NULL UNIQUE,
  submission_data JSONB DEFAULT '{"files": [], "text_answers": [], "urls": []}'::jsonb,
  submitted_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  reviewer_comments TEXT,
  reviewed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hiring interviews table
CREATE TABLE public.hiring_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL DEFAULT 'general',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  interviewer_ids UUID[] DEFAULT '{}',
  status public.interview_status DEFAULT 'scheduled',
  notes TEXT,
  calendar_event_id TEXT,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Interview scorecards table
CREATE TABLE public.interview_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES public.hiring_interviews(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  ratings JSONB DEFAULT '{}'::jsonb,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  recommendation public.interview_recommendation,
  strengths TEXT,
  concerns TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(interview_id, interviewer_id)
);

-- Hiring offers table
CREATE TABLE public.hiring_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  level TEXT,
  base_salary NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  bonuses JSONB DEFAULT '[]'::jsonb,
  equity TEXT,
  start_date DATE,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  employment_type public.hiring_employment_type DEFAULT 'full_time',
  notes TEXT,
  status public.offer_status DEFAULT 'draft',
  offer_letter_path TEXT,
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  expires_at DATE,
  responded_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hiring activity logs table
CREATE TABLE public.hiring_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action public.hiring_activity_action NOT NULL,
  actor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hiring email templates table
CREATE TABLE public.hiring_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_jobs_organization_id ON public.jobs(organization_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_slug ON public.jobs(organization_id, slug);
CREATE INDEX idx_jobs_hiring_manager ON public.jobs(hiring_manager_id);
CREATE INDEX idx_jobs_department ON public.jobs(department_id);

CREATE INDEX idx_job_stages_job_id ON public.job_stages(job_id);
CREATE INDEX idx_job_stages_organization_id ON public.job_stages(organization_id);

CREATE INDEX idx_candidates_organization_id ON public.candidates(organization_id);
CREATE INDEX idx_candidates_email ON public.candidates(organization_id, email);
CREATE INDEX idx_candidates_employee_id ON public.candidates(employee_id);

CREATE INDEX idx_candidate_applications_organization_id ON public.candidate_applications(organization_id);
CREATE INDEX idx_candidate_applications_candidate_id ON public.candidate_applications(candidate_id);
CREATE INDEX idx_candidate_applications_job_id ON public.candidate_applications(job_id);
CREATE INDEX idx_candidate_applications_stage ON public.candidate_applications(stage);
CREATE INDEX idx_candidate_applications_status ON public.candidate_applications(status);

CREATE INDEX idx_assignment_templates_organization_id ON public.assignment_templates(organization_id);
CREATE INDEX idx_assignment_instances_organization_id ON public.assignment_instances(organization_id);
CREATE INDEX idx_assignment_instances_application_id ON public.assignment_instances(candidate_application_id);
CREATE INDEX idx_assignment_instances_token ON public.assignment_instances(secure_token);
CREATE INDEX idx_assignment_instances_deadline ON public.assignment_instances(deadline);
CREATE INDEX idx_assignment_instances_status ON public.assignment_instances(status);

CREATE INDEX idx_hiring_interviews_organization_id ON public.hiring_interviews(organization_id);
CREATE INDEX idx_hiring_interviews_application_id ON public.hiring_interviews(application_id);
CREATE INDEX idx_hiring_interviews_scheduled_at ON public.hiring_interviews(scheduled_at);
CREATE INDEX idx_hiring_interviews_status ON public.hiring_interviews(status);

CREATE INDEX idx_interview_scorecards_organization_id ON public.interview_scorecards(organization_id);
CREATE INDEX idx_interview_scorecards_interview_id ON public.interview_scorecards(interview_id);
CREATE INDEX idx_interview_scorecards_interviewer_id ON public.interview_scorecards(interviewer_id);

CREATE INDEX idx_hiring_offers_organization_id ON public.hiring_offers(organization_id);
CREATE INDEX idx_hiring_offers_application_id ON public.hiring_offers(application_id);
CREATE INDEX idx_hiring_offers_status ON public.hiring_offers(status);

CREATE INDEX idx_hiring_activity_logs_organization_id ON public.hiring_activity_logs(organization_id);
CREATE INDEX idx_hiring_activity_logs_entity ON public.hiring_activity_logs(entity_type, entity_id);
CREATE INDEX idx_hiring_activity_logs_created_at ON public.hiring_activity_logs(created_at);

CREATE INDEX idx_hiring_email_templates_organization_id ON public.hiring_email_templates(organization_id);
CREATE INDEX idx_hiring_email_templates_type ON public.hiring_email_templates(template_type);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiring_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiring_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiring_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiring_email_templates ENABLE ROW LEVEL SECURITY;

-- Helper function to check hiring access (Owner, Admin, HR roles) using existing has_role pattern
CREATE OR REPLACE FUNCTION public.has_hiring_access(check_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    has_role(auth.uid(), 'owner'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'hr'::app_role)
  ) AND is_org_member(auth.uid(), check_organization_id)
$$;

-- Jobs policies
CREATE POLICY "Users can view jobs in their organization"
  ON public.jobs FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR/Admin/Owner can manage jobs"
  ON public.jobs FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Job stages policies
CREATE POLICY "Users can view job stages in their organization"
  ON public.job_stages FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR/Admin/Owner can manage job stages"
  ON public.job_stages FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Candidates policies
CREATE POLICY "HR/Admin/Owner can view candidates"
  ON public.candidates FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can manage candidates"
  ON public.candidates FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Candidate applications policies
CREATE POLICY "HR/Admin/Owner can view applications"
  ON public.candidate_applications FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can manage applications"
  ON public.candidate_applications FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Assignment templates policies
CREATE POLICY "HR/Admin/Owner can view assignment templates"
  ON public.assignment_templates FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can manage assignment templates"
  ON public.assignment_templates FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Assignment instances policies
CREATE POLICY "HR/Admin/Owner can view assignment instances"
  ON public.assignment_instances FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can manage assignment instances"
  ON public.assignment_instances FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Hiring interviews policies
CREATE POLICY "HR/Admin/Owner can view interviews"
  ON public.hiring_interviews FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can manage interviews"
  ON public.hiring_interviews FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Interview scorecards policies
CREATE POLICY "HR/Admin/Owner can view scorecards"
  ON public.interview_scorecards FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can manage scorecards"
  ON public.interview_scorecards FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Hiring offers policies
CREATE POLICY "HR/Admin/Owner can view offers"
  ON public.hiring_offers FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can manage offers"
  ON public.hiring_offers FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- Hiring activity logs policies
CREATE POLICY "HR/Admin/Owner can view activity logs"
  ON public.hiring_activity_logs FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can create activity logs"
  ON public.hiring_activity_logs FOR INSERT
  WITH CHECK (has_hiring_access(organization_id));

-- Hiring email templates policies
CREATE POLICY "HR/Admin/Owner can view email templates"
  ON public.hiring_email_templates FOR SELECT
  USING (has_hiring_access(organization_id));

CREATE POLICY "HR/Admin/Owner can manage email templates"
  ON public.hiring_email_templates FOR ALL
  USING (has_hiring_access(organization_id))
  WITH CHECK (has_hiring_access(organization_id));

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp triggers
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_stages_updated_at
  BEFORE UPDATE ON public.job_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_applications_updated_at
  BEFORE UPDATE ON public.candidate_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_templates_updated_at
  BEFORE UPDATE ON public.assignment_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_instances_updated_at
  BEFORE UPDATE ON public.assignment_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hiring_interviews_updated_at
  BEFORE UPDATE ON public.hiring_interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_scorecards_updated_at
  BEFORE UPDATE ON public.interview_scorecards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hiring_offers_updated_at
  BEFORE UPDATE ON public.hiring_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hiring_email_templates_updated_at
  BEFORE UPDATE ON public.hiring_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hiring_interviews;