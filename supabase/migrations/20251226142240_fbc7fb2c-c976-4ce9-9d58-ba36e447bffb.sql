-- Create table for tracking KPI generation jobs
CREATE TABLE public.kpi_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT,
  
  -- Input configuration (stored for retry)
  config JSONB NOT NULL,
  
  -- Output
  generated_kpis JSONB,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX idx_kpi_generation_jobs_org ON public.kpi_generation_jobs(organization_id);
CREATE INDEX idx_kpi_generation_jobs_status ON public.kpi_generation_jobs(status);
CREATE INDEX idx_kpi_generation_jobs_created_by ON public.kpi_generation_jobs(created_by);

-- Enable Row Level Security
ALTER TABLE public.kpi_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view jobs in their organization
CREATE POLICY "Users can view their org jobs" ON public.kpi_generation_jobs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Users can create jobs in their organization
CREATE POLICY "Users can create jobs in their org" ON public.kpi_generation_jobs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Service role can update jobs (for edge function)
CREATE POLICY "Service role can update jobs" ON public.kpi_generation_jobs
  FOR UPDATE USING (true) WITH CHECK (true);

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_generation_jobs;