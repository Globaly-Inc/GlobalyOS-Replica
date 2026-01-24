-- Create detailed AI usage logs table for tracking and billing
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  
  -- Request details
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  query_type TEXT NOT NULL DEFAULT 'internal' CHECK (query_type IN ('internal', 'general')),
  prompt_length INTEGER,
  response_length INTEGER,
  
  -- Token tracking (for billing)
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Cost tracking
  estimated_cost NUMERIC(10, 6) DEFAULT 0,
  
  -- Performance
  latency_ms INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for analytics and performance
CREATE INDEX idx_ai_usage_logs_org_date ON ai_usage_logs (organization_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_user ON ai_usage_logs (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_model ON ai_usage_logs (model, created_at DESC);
CREATE INDEX idx_ai_usage_logs_query_type ON ai_usage_logs (query_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Super-admin can see all logs
CREATE POLICY "Super admins can view all AI logs" ON ai_usage_logs
  FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Org admins can view their org's logs
CREATE POLICY "Org admins can view org AI logs" ON ai_usage_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'hr')
    )
  );

-- Users can view their own logs
CREATE POLICY "Users can view own AI logs" ON ai_usage_logs
  FOR SELECT USING (user_id = auth.uid());

-- Allow insert from edge functions (service role)
CREATE POLICY "Service role can insert AI logs" ON ai_usage_logs
  FOR INSERT WITH CHECK (true);

-- Add new columns to ai_knowledge_settings for model selection and general AI
ALTER TABLE ai_knowledge_settings 
ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT 'google/gemini-2.5-flash',
ADD COLUMN IF NOT EXISTS allowed_models TEXT[] DEFAULT ARRAY['google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
ADD COLUMN IF NOT EXISTS general_ai_enabled BOOLEAN DEFAULT true;

-- Add ai_tokens feature to plan_limits if not exists
INSERT INTO plan_limits (plan, feature, monthly_limit, overage_rate, feature_name, unit, sort_order, is_active)
VALUES 
  ('starter', 'ai_tokens', 50000, 0.00002, 'AI Tokens', 'tokens', 15, true),
  ('growth', 'ai_tokens', 500000, 0.00001, 'AI Tokens', 'tokens', 15, true),
  ('enterprise', 'ai_tokens', 5000000, 0.000005, 'AI Tokens', 'tokens', 15, true)
ON CONFLICT (plan, feature) DO UPDATE SET
  monthly_limit = EXCLUDED.monthly_limit,
  overage_rate = EXCLUDED.overage_rate,
  feature_name = EXCLUDED.feature_name,
  unit = EXCLUDED.unit;

-- Create monthly aggregation view for super-admin analytics
CREATE OR REPLACE VIEW ai_usage_monthly_summary AS
SELECT 
  organization_id,
  date_trunc('month', created_at) as month,
  COUNT(*) as total_queries,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost) as total_cost,
  COUNT(CASE WHEN query_type = 'internal' THEN 1 END) as internal_queries,
  COUNT(CASE WHEN query_type = 'general' THEN 1 END) as general_queries,
  AVG(latency_ms) as avg_latency_ms,
  jsonb_object_agg(COALESCE(model, 'unknown'), model_count) as model_distribution
FROM (
  SELECT 
    organization_id,
    created_at,
    total_tokens,
    estimated_cost,
    query_type,
    latency_ms,
    model,
    COUNT(*) OVER (PARTITION BY organization_id, date_trunc('month', created_at), model) as model_count
  FROM ai_usage_logs
) sub
GROUP BY organization_id, date_trunc('month', created_at);

-- Grant access to the view
GRANT SELECT ON ai_usage_monthly_summary TO authenticated;