-- Create workflow_task_checklists table
CREATE TABLE public.workflow_task_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.employee_workflow_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_workflow_task_checklists_task_id ON public.workflow_task_checklists(task_id);
CREATE INDEX idx_workflow_task_checklists_organization_id ON public.workflow_task_checklists(organization_id);

-- Enable RLS
ALTER TABLE public.workflow_task_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view checklists in their organization"
ON public.workflow_task_checklists
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create checklists in their organization"
ON public.workflow_task_checklists
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update checklists in their organization"
ON public.workflow_task_checklists
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete checklists in their organization"
ON public.workflow_task_checklists
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_workflow_task_checklists_updated_at
BEFORE UPDATE ON public.workflow_task_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();