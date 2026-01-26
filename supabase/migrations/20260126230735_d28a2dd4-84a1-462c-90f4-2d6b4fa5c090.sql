-- Fix SECURITY DEFINER view: ai_usage_monthly_summary
-- This view was created without security_invoker, causing it to bypass RLS policies
-- Recreate it with security_invoker=on to enforce RLS of the querying user

DROP VIEW IF EXISTS public.ai_usage_monthly_summary;

CREATE VIEW public.ai_usage_monthly_summary
WITH (security_invoker = on) AS
SELECT 
    organization_id,
    date_trunc('month'::text, created_at) AS month,
    count(*) AS total_queries,
    sum(total_tokens) AS total_tokens,
    sum(estimated_cost) AS total_cost,
    count(
        CASE
            WHEN query_type = 'internal'::text THEN 1
            ELSE NULL::integer
        END) AS internal_queries,
    count(
        CASE
            WHEN query_type = 'general'::text THEN 1
            ELSE NULL::integer
        END) AS general_queries,
    avg(latency_ms) AS avg_latency_ms,
    jsonb_object_agg(COALESCE(model, 'unknown'::text), model_count) AS model_distribution
FROM ( 
    SELECT 
        ai_usage_logs.organization_id,
        ai_usage_logs.created_at,
        ai_usage_logs.total_tokens,
        ai_usage_logs.estimated_cost,
        ai_usage_logs.query_type,
        ai_usage_logs.latency_ms,
        ai_usage_logs.model,
        count(*) OVER (PARTITION BY ai_usage_logs.organization_id, (date_trunc('month'::text, ai_usage_logs.created_at)), ai_usage_logs.model) AS model_count
    FROM ai_usage_logs
) sub
GROUP BY organization_id, (date_trunc('month'::text, created_at));

-- Grant appropriate permissions
GRANT SELECT ON public.ai_usage_monthly_summary TO authenticated;