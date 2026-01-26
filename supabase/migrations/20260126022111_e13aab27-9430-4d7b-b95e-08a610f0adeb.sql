-- ============================================
-- PHASE 1: Enable pgvector & Knowledge Embeddings
-- ============================================

-- Enable the pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge embeddings table for RAG
CREATE TABLE IF NOT EXISTS public.knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Source tracking
  source_type TEXT NOT NULL, -- 'wiki_page', 'announcement', 'team_member', 'leave_record', 'attendance', 'kpi', 'birthday', 'anniversary', 'calendar_event', 'conversation_history', 'document', 'performance_review'
  source_id UUID NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  
  -- Content
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1536), -- Compatible with OpenAI/Gemini embedding dimensions
  
  -- Role-based access control
  access_level TEXT NOT NULL DEFAULT 'all', -- 'all', 'self', 'manager', 'admin_hr', 'owner'
  access_entities UUID[] DEFAULT '{}', -- specific employee IDs for fine-grained access
  
  -- Metadata for filtering
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_org ON public.knowledge_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_source ON public.knowledge_embeddings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_access ON public.knowledge_embeddings(access_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_metadata ON public.knowledge_embeddings USING gin(metadata);

-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector ON public.knowledge_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "knowledge_embeddings_org_read" ON public.knowledge_embeddings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "knowledge_embeddings_service_all" ON public.knowledge_embeddings
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================
-- Vector similarity search function
-- ============================================
CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.70,
  match_count int DEFAULT 15,
  org_id uuid DEFAULT NULL,
  user_role text DEFAULT 'member',
  employee_id uuid DEFAULT NULL,
  manager_employee_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.source_type,
    ke.source_id,
    ke.title,
    ke.content,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  WHERE ke.organization_id = org_id
    AND ke.embedding IS NOT NULL
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
    AND (
      -- Public content
      ke.access_level = 'all'
      -- Self-only content
      OR (ke.access_level = 'self' AND (ke.metadata->>'employee_id')::uuid = employee_id)
      -- Manager sees direct reports
      OR (ke.access_level = 'manager' AND (
        (ke.metadata->>'employee_id')::uuid = employee_id 
        OR (ke.metadata->>'employee_id')::uuid = ANY(manager_employee_ids)
      ))
      -- Admin/HR sees most
      OR (ke.access_level = 'admin_hr' AND user_role IN ('admin', 'hr', 'owner'))
      -- Owner sees all
      OR (ke.access_level = 'owner' AND user_role = 'owner')
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- PHASE 3: Token Billing System
-- ============================================

-- Token balances per organization
CREATE TABLE IF NOT EXISTS public.token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Balance tracking
  available_tokens BIGINT DEFAULT 0,
  used_tokens_this_period BIGINT DEFAULT 0,
  included_tokens BIGINT DEFAULT 0, -- From subscription plan
  purchased_tokens BIGINT DEFAULT 0, -- From top-ups
  
  -- Period tracking
  period_start TIMESTAMPTZ DEFAULT date_trunc('month', now()),
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Token packages for purchase
CREATE TABLE IF NOT EXISTS public.token_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tokens BIGINT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  bonus_percentage INTEGER DEFAULT 0, -- e.g., 5 = 5% bonus
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Token purchase history
CREATE TABLE IF NOT EXISTS public.token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.token_packages(id),
  
  -- Purchase details
  tokens_purchased BIGINT NOT NULL,
  bonus_tokens BIGINT DEFAULT 0,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Payment info
  payment_method TEXT, -- 'card', 'invoice', 'manual'
  payment_reference TEXT, -- Stripe payment ID, invoice number, etc.
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  
  -- Audit
  purchased_by UUID REFERENCES public.profiles(id),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Daily token usage breakdown by model
CREATE TABLE IF NOT EXISTS public.token_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  model TEXT NOT NULL,
  
  -- Token counts
  prompt_tokens BIGINT DEFAULT 0,
  completion_tokens BIGINT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  
  -- Cost tracking
  estimated_cost_cents INTEGER DEFAULT 0,
  query_count INTEGER DEFAULT 0,
  
  -- Unique constraint for upserts
  CONSTRAINT token_usage_daily_unique UNIQUE (organization_id, employee_id, date, model)
);

-- Enable RLS on billing tables
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for token_balances
CREATE POLICY "token_balances_org_read" ON public.token_balances
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "token_balances_admin_update" ON public.token_balances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
        AND ur.organization_id = token_balances.organization_id
        AND ur.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "token_balances_service_all" ON public.token_balances
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for token_packages (public read for pricing page)
CREATE POLICY "token_packages_public_read" ON public.token_packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "token_packages_service_all" ON public.token_packages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for token_purchases
CREATE POLICY "token_purchases_org_read" ON public.token_purchases
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "token_purchases_admin_insert" ON public.token_purchases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
        AND ur.organization_id = token_purchases.organization_id
        AND ur.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "token_purchases_service_all" ON public.token_purchases
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for token_usage_daily
CREATE POLICY "token_usage_daily_org_read" ON public.token_usage_daily
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "token_usage_daily_service_all" ON public.token_usage_daily
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- Extend ai_knowledge_settings for owner configuration
-- ============================================
ALTER TABLE public.ai_knowledge_settings 
  ADD COLUMN IF NOT EXISTS owner_restricted_models TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_tokens_per_query INTEGER DEFAULT 4000,
  ADD COLUMN IF NOT EXISTS max_tokens_per_day_per_user INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cost_alerts_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS monthly_token_budget BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS streaming_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS general_queries_enabled BOOLEAN DEFAULT true;

-- ============================================
-- Insert default token packages
-- ============================================
INSERT INTO public.token_packages (name, description, tokens, price_cents, currency, bonus_percentage, is_popular, sort_order)
VALUES 
  ('Starter Pack', 'Perfect for small teams getting started', 50000, 799, 'USD', 0, false, 1),
  ('Growth Pack', 'Best value for growing organizations', 200000, 2499, 'USD', 0, false, 2),
  ('Pro Pack', 'For power users with high AI usage', 500000, 4999, 'USD', 5, true, 3),
  ('Enterprise Pack', 'Maximum tokens with best rates', 2000000, 15999, 'USD', 15, false, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- Function to deduct tokens on AI query
-- ============================================
CREATE OR REPLACE FUNCTION public.deduct_ai_tokens(
  org_id UUID,
  tokens_used BIGINT,
  model_name TEXT DEFAULT 'unknown'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance BIGINT;
  result JSONB;
BEGIN
  -- Get or create token balance
  INSERT INTO token_balances (organization_id, available_tokens)
  VALUES (org_id, 0)
  ON CONFLICT (organization_id) DO NOTHING;
  
  -- Get current balance
  SELECT available_tokens INTO current_balance
  FROM token_balances WHERE organization_id = org_id;
  
  -- Check if sufficient tokens
  IF current_balance < tokens_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'available', current_balance,
      'required', tokens_used
    );
  END IF;
  
  -- Deduct tokens
  UPDATE token_balances
  SET 
    available_tokens = available_tokens - tokens_used,
    used_tokens_this_period = used_tokens_this_period + tokens_used,
    updated_at = now()
  WHERE organization_id = org_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'tokens_deducted', tokens_used,
    'remaining', current_balance - tokens_used
  );
END;
$$;

-- ============================================
-- Function to reset monthly token usage
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_monthly_token_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE token_balances
  SET 
    used_tokens_this_period = 0,
    available_tokens = included_tokens + purchased_tokens,
    period_start = date_trunc('month', now()),
    last_reset_at = now(),
    updated_at = now();
END;
$$;

-- ============================================
-- Indexes for billing queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_token_usage_daily_org_date ON public.token_usage_daily(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_daily_employee ON public.token_usage_daily(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_token_purchases_org ON public.token_purchases(organization_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_org_date ON public.ai_usage_logs(organization_id, created_at DESC);

-- ============================================
-- Enable realtime for token updates
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.token_balances;