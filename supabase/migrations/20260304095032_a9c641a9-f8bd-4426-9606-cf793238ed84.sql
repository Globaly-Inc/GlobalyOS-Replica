
-- Candidate Experiences (work history)
CREATE TABLE public.candidate_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  is_current BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view candidate experiences"
  ON public.candidate_experiences FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert candidate experiences"
  ON public.candidate_experiences FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update candidate experiences"
  ON public.candidate_experiences FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can delete candidate experiences"
  ON public.candidate_experiences FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- Candidate Education
CREATE TABLE public.candidate_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  field_of_study TEXT,
  start_year TEXT,
  end_year TEXT,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view candidate education"
  ON public.candidate_education FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert candidate education"
  ON public.candidate_education FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update candidate education"
  ON public.candidate_education FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can delete candidate education"
  ON public.candidate_education FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

-- Candidate Skills
CREATE TABLE public.candidate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  proficiency_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view candidate skills"
  ON public.candidate_skills FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert candidate skills"
  ON public.candidate_skills FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can update candidate skills"
  ON public.candidate_skills FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org members can delete candidate skills"
  ON public.candidate_skills FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));
