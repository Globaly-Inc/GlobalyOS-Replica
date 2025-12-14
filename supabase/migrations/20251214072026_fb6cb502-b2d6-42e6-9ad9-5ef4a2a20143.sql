-- Create subscription_plans table for managing plan configurations
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  tagline TEXT,
  
  -- Pricing
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  annual_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Trial
  trial_days INTEGER NOT NULL DEFAULT 7,
  
  -- Display
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Features
  feature_highlights JSONB DEFAULT '[]'::jsonb,
  
  -- Stripe Integration
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to plan_limits for better feature management
ALTER TABLE public.plan_limits 
  ADD COLUMN IF NOT EXISTS feature_name TEXT,
  ADD COLUMN IF NOT EXISTS feature_description TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'count',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans
CREATE POLICY "Super admins can manage all plans"
  ON public.subscription_plans
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Anyone can view active public plans"
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true AND is_public = true);

-- Trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default plans
INSERT INTO public.subscription_plans (name, slug, description, tagline, monthly_price, annual_price, currency, trial_days, is_active, is_public, is_popular, sort_order, feature_highlights)
VALUES 
  ('Starter', 'starter', 'Perfect for small teams getting started', 'Best for small teams', 149, 1430, 'USD', 7, true, true, false, 1, 
   '["Unlimited team members", "5GB storage", "Basic attendance tracking", "Leave management", "Team directory", "Email support"]'::jsonb),
  ('Growth', 'growth', 'For growing teams that need more power', 'Most popular choice', 299, 2870, 'USD', 7, true, true, true, 2,
   '["Everything in Starter", "50GB storage", "100 AI queries/month", "Wiki & knowledge base", "Team chat", "Performance reviews", "Priority support"]'::jsonb),
  ('Enterprise', 'enterprise', 'For large organizations with custom needs', 'Custom solutions', 0, 0, 'USD', 14, true, true, false, 3,
   '["Everything in Growth", "Unlimited storage", "Unlimited AI queries", "Custom integrations", "SSO & advanced security", "Dedicated account manager", "SLA guarantee"]'::jsonb);

-- Update plan_limits with feature metadata
UPDATE public.plan_limits SET 
  feature_name = CASE feature
    WHEN 'ai_queries' THEN 'AI Queries'
    WHEN 'storage_gb' THEN 'Storage'
    WHEN 'performance_reviews' THEN 'Performance Reviews'
    WHEN 'leave_requests' THEN 'Leave Requests'
    WHEN 'attendance_scans' THEN 'Attendance Scans'
    ELSE feature
  END,
  unit = CASE feature
    WHEN 'storage_gb' THEN 'GB'
    WHEN 'ai_queries' THEN 'queries'
    ELSE 'count'
  END,
  sort_order = CASE feature
    WHEN 'storage_gb' THEN 1
    WHEN 'ai_queries' THEN 2
    WHEN 'performance_reviews' THEN 3
    WHEN 'leave_requests' THEN 4
    WHEN 'attendance_scans' THEN 5
    ELSE 10
  END;