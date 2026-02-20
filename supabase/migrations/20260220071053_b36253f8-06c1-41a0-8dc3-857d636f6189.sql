
-- ================================================
-- FORMS MODULE: Database Schema
-- ================================================

-- 1. Forms table
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_version_id UUID,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- 2. Form versions table
CREATE TABLE public.form_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  layout_tree JSONB NOT NULL DEFAULT '[]'::jsonb,
  logic_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from forms to form_versions (after both tables exist)
ALTER TABLE public.forms
  ADD CONSTRAINT forms_published_version_id_fkey
  FOREIGN KEY (published_version_id) REFERENCES public.form_versions(id) ON DELETE SET NULL;

-- 3. Form submissions table
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  form_version_id UUID NOT NULL REFERENCES public.form_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'spam')),
  assignee_user_id UUID,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitter_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Form submission files
CREATE TABLE public.form_submission_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Form audit logs
CREATE TABLE public.form_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX idx_forms_org_id ON public.forms(organization_id);
CREATE INDEX idx_forms_slug ON public.forms(organization_id, slug);
CREATE INDEX idx_form_versions_form_id ON public.form_versions(form_id);
CREATE INDEX idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_org_id ON public.form_submissions(organization_id);
CREATE INDEX idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX idx_form_submission_files_submission ON public.form_submission_files(submission_id);
CREATE INDEX idx_form_audit_logs_form_id ON public.form_audit_logs(form_id);

-- ================================================
-- RLS POLICIES
-- ================================================

-- Forms RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forms in their org"
  ON public.forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = forms.organization_id
    )
  );

CREATE POLICY "Users can create forms in their org"
  ON public.forms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = forms.organization_id
    )
  );

CREATE POLICY "Users can update forms in their org"
  ON public.forms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = forms.organization_id
    )
  );

CREATE POLICY "Users can delete forms in their org"
  ON public.forms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = forms.organization_id
    )
  );

-- Form versions RLS
ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form versions in their org"
  ON public.form_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = form_versions.organization_id
    )
  );

CREATE POLICY "Users can create form versions in their org"
  ON public.form_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = form_versions.organization_id
    )
  );

-- Form submissions RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submissions in their org"
  ON public.form_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = form_submissions.organization_id
    )
  );

CREATE POLICY "Users can update submissions in their org"
  ON public.form_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = form_submissions.organization_id
    )
  );

-- Form submission files RLS
ALTER TABLE public.form_submission_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submission files in their org"
  ON public.form_submission_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = form_submission_files.organization_id
    )
  );

-- Form audit logs RLS
ALTER TABLE public.form_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs in their org"
  ON public.form_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = form_audit_logs.organization_id
    )
  );

CREATE POLICY "Users can create audit logs in their org"
  ON public.form_audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = form_audit_logs.organization_id
    )
  );

-- Updated_at trigger for forms
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for submissions
CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for form uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for form-uploads bucket
CREATE POLICY "Org members can view form uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-uploads');

CREATE POLICY "Org members can upload form files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'form-uploads' AND auth.uid() IS NOT NULL);
