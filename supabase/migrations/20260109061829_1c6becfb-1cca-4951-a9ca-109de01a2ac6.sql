-- Create workflow_activity_logs table for tracking all workflow actions
CREATE TABLE public.workflow_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.employee_workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.workflow_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for efficient queries
CREATE INDEX idx_workflow_activity_logs_workflow ON public.workflow_activity_logs(workflow_id);
CREATE INDEX idx_workflow_activity_logs_created ON public.workflow_activity_logs(created_at DESC);
CREATE INDEX idx_workflow_activity_logs_org ON public.workflow_activity_logs(organization_id);

-- RLS policy: Users can view activity logs in their organization
CREATE POLICY "Users can view activity logs in their org"
  ON public.workflow_activity_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Users can insert activity logs in their organization
CREATE POLICY "Users can insert activity logs in their org"
  ON public.workflow_activity_logs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_activity_logs;