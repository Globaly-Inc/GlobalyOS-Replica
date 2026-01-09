-- Create workflow_task_attachments table
CREATE TABLE public.workflow_task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.employee_workflow_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view attachments in their organization"
ON public.workflow_task_attachments
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload attachments in their organization"
ON public.workflow_task_attachments
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete attachments they uploaded"
ON public.workflow_task_attachments
FOR DELETE
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_workflow_task_attachments_task_id ON public.workflow_task_attachments(task_id);
CREATE INDEX idx_workflow_task_attachments_organization_id ON public.workflow_task_attachments(organization_id);

-- Create storage bucket for workflow task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('workflow-task-attachments', 'workflow-task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view workflow task attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'workflow-task-attachments');

CREATE POLICY "Users can upload workflow task attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'workflow-task-attachments');

CREATE POLICY "Users can delete workflow task attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'workflow-task-attachments');