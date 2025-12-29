-- Add last_heartbeat column to track job progress and detect stale jobs
ALTER TABLE public.kpi_generation_jobs 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for efficient stale job queries
CREATE INDEX IF NOT EXISTS idx_kpi_generation_jobs_heartbeat 
ON public.kpi_generation_jobs (status, last_heartbeat) 
WHERE status = 'processing';