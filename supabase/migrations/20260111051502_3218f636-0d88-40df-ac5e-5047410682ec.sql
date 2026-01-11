-- Create workflow_stage_notes table for stage-level discussions
CREATE TABLE public.workflow_stage_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.employee_workflows(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES public.workflow_stage_notes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create workflow_stage_note_mentions table for tracking mentions
CREATE TABLE public.workflow_stage_note_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.workflow_stage_notes(id) ON DELETE CASCADE,
  mentioned_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create workflow_stage_attachments table for file uploads
CREATE TABLE public.workflow_stage_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.employee_workflows(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_workflow_stage_notes_workflow_stage ON public.workflow_stage_notes(workflow_id, stage_id);
CREATE INDEX idx_workflow_stage_notes_parent ON public.workflow_stage_notes(parent_id);
CREATE INDEX idx_workflow_stage_note_mentions_note ON public.workflow_stage_note_mentions(note_id);
CREATE INDEX idx_workflow_stage_note_mentions_employee ON public.workflow_stage_note_mentions(mentioned_employee_id);
CREATE INDEX idx_workflow_stage_attachments_workflow_stage ON public.workflow_stage_attachments(workflow_id, stage_id);

-- Enable RLS on all tables
ALTER TABLE public.workflow_stage_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_note_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_stage_notes
CREATE POLICY "Users can view notes in their organization"
ON public.workflow_stage_notes
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert notes in their organization"
ON public.workflow_stage_notes
FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own notes"
ON public.workflow_stage_notes
FOR UPDATE
USING (employee_id IN (
  SELECT id FROM public.employees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete their own notes"
ON public.workflow_stage_notes
FOR DELETE
USING (employee_id IN (
  SELECT id FROM public.employees WHERE user_id = auth.uid()
));

-- RLS Policies for workflow_stage_note_mentions
CREATE POLICY "Users can view mentions in their organization"
ON public.workflow_stage_note_mentions
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert mentions in their organization"
ON public.workflow_stage_note_mentions
FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete mentions for their notes"
ON public.workflow_stage_note_mentions
FOR DELETE
USING (note_id IN (
  SELECT id FROM public.workflow_stage_notes WHERE employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
));

-- RLS Policies for workflow_stage_attachments
CREATE POLICY "Users can view attachments in their organization"
ON public.workflow_stage_attachments
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert attachments in their organization"
ON public.workflow_stage_attachments
FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete their own attachments"
ON public.workflow_stage_attachments
FOR DELETE
USING (employee_id IN (
  SELECT id FROM public.employees WHERE user_id = auth.uid()
));

-- Create storage bucket for workflow stage attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('workflow-stage-attachments', 'workflow-stage-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for workflow-stage-attachments bucket
CREATE POLICY "Users can view workflow stage attachments in their org"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'workflow-stage-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can upload workflow stage attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'workflow-stage-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own workflow stage attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'workflow-stage-attachments' 
  AND auth.uid() IS NOT NULL
);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_stage_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_stage_attachments;

-- Create updated_at trigger for workflow_stage_notes
CREATE TRIGGER update_workflow_stage_notes_updated_at
  BEFORE UPDATE ON public.workflow_stage_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();