-- Create workflow_task_comments table
CREATE TABLE public.workflow_task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.employee_workflow_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_task_comment_mentions table
CREATE TABLE public.workflow_task_comment_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.workflow_task_comments(id) ON DELETE CASCADE,
  mentioned_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_task_comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_task_comments
CREATE POLICY "Users can view comments in their organization"
  ON public.workflow_task_comments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments in their organization"
  ON public.workflow_task_comments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.workflow_task_comments FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.workflow_task_comments FOR DELETE
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS policies for workflow_task_comment_mentions
CREATE POLICY "Users can view mentions in their organization"
  ON public.workflow_task_comment_mentions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mentions in their organization"
  ON public.workflow_task_comment_mentions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete mentions from their comments"
  ON public.workflow_task_comment_mentions FOR DELETE
  USING (
    comment_id IN (
      SELECT id FROM public.workflow_task_comments 
      WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX idx_workflow_task_comments_task_id ON public.workflow_task_comments(task_id);
CREATE INDEX idx_workflow_task_comments_org_id ON public.workflow_task_comments(organization_id);
CREATE INDEX idx_workflow_task_comment_mentions_comment_id ON public.workflow_task_comment_mentions(comment_id);

-- Add updated_at trigger
CREATE TRIGGER update_workflow_task_comments_updated_at
  BEFORE UPDATE ON public.workflow_task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();