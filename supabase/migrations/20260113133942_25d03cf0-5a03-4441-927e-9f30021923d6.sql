-- Add enhanced error logging columns for engineering debugging context
ALTER TABLE public.user_error_logs
ADD COLUMN IF NOT EXISTS console_logs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS network_requests jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS breadcrumbs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS session_duration_ms integer,
ADD COLUMN IF NOT EXISTS route_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS performance_metrics jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.user_error_logs.console_logs IS 'Last 20 console.error/warn entries before the error';
COMMENT ON COLUMN public.user_error_logs.network_requests IS 'Last 20 network requests with URL, status, duration';
COMMENT ON COLUMN public.user_error_logs.breadcrumbs IS 'User action trail leading to the error';
COMMENT ON COLUMN public.user_error_logs.session_duration_ms IS 'How long user has been active on the site';
COMMENT ON COLUMN public.user_error_logs.route_history IS 'Pages visited in order';
COMMENT ON COLUMN public.user_error_logs.performance_metrics IS 'Memory, connection type, performance data at time of error';