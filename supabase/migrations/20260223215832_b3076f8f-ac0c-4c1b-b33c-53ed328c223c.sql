
-- Feature 2: Add show_work_links to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS show_work_links BOOLEAN DEFAULT false;

-- Feature 4a: Add 'accepted' status to assignment_status enum
ALTER TYPE public.assignment_status ADD VALUE IF NOT EXISTS 'accepted' BEFORE 'in_progress';

-- Feature 4a: Add accepted_at column to assignment_instances
ALTER TABLE public.assignment_instances ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Feature 4c/d: Add overdue_notified_at column
ALTER TABLE public.assignment_instances ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

-- Feature 4e: Create assignment_reviewers table
CREATE TABLE IF NOT EXISTS public.assignment_reviewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_instance_id UUID NOT NULL REFERENCES public.assignment_instances(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_instance_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.assignment_reviewers ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment_reviewers
CREATE POLICY "Users can view assignment reviewers in their org"
  ON public.assignment_reviewers FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage assignment reviewers"
  ON public.assignment_reviewers FOR ALL
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));
