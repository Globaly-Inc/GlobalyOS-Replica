-- =====================================================
-- PHASE 1: Subscription Management Database Schema
-- =====================================================

-- 1. Modify organizations table with approval workflow columns
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS owner_email TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual'));

-- 2. Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  trial_starts_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  payment_method_type TEXT CHECK (payment_method_type IN ('stripe', 'bank_transfer', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- 3. Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'void', 'refunded')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  billing_period_start DATE,
  billing_period_end DATE,
  line_items JSONB DEFAULT '[]',
  stripe_invoice_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'bank_transfer', 'cheque', 'cash', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_id TEXT,
  reference_number TEXT,
  notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create usage_records table
CREATE TABLE public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  billing_period DATE NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- 6. Create plan_limits table
CREATE TABLE public.plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'enterprise')),
  feature TEXT NOT NULL,
  monthly_limit INTEGER,
  overage_rate NUMERIC(10,4),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan, feature)
);

-- 7. Create onboarding_progress table
CREATE TABLE public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  is_completed BOOLEAN DEFAULT false,
  tour_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, organization_id)
);

-- =====================================================
-- Enable RLS on all new tables
-- =====================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for subscriptions
-- =====================================================

CREATE POLICY "Super admins can manage all subscriptions"
ON public.subscriptions FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Org owners can view their subscription"
ON public.subscriptions FOR SELECT
USING (is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Org admins can view their subscription"
ON public.subscriptions FOR SELECT
USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- RLS Policies for invoices
-- =====================================================

CREATE POLICY "Super admins can manage all invoices"
ON public.invoices FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Org owners can view their invoices"
ON public.invoices FOR SELECT
USING (is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Org admins can view their invoices"
ON public.invoices FOR SELECT
USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- RLS Policies for payments
-- =====================================================

CREATE POLICY "Super admins can manage all payments"
ON public.payments FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Org owners can view their payments"
ON public.payments FOR SELECT
USING (is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Org admins can view their payments"
ON public.payments FOR SELECT
USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- RLS Policies for usage_records
-- =====================================================

CREATE POLICY "Super admins can manage all usage records"
ON public.usage_records FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Org members can view their usage"
ON public.usage_records FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can insert usage records"
ON public.usage_records FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

-- =====================================================
-- RLS Policies for plan_limits
-- =====================================================

CREATE POLICY "Anyone can view plan limits"
ON public.plan_limits FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage plan limits"
ON public.plan_limits FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- =====================================================
-- RLS Policies for onboarding_progress
-- =====================================================

CREATE POLICY "Users can view own onboarding progress"
ON public.onboarding_progress FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding progress"
ON public.onboarding_progress FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding progress"
ON public.onboarding_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage all onboarding"
ON public.onboarding_progress FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- =====================================================
-- Insert default plan limits
-- =====================================================

INSERT INTO public.plan_limits (plan, feature, monthly_limit, overage_rate) VALUES
  -- Starter plan limits
  ('starter', 'leave_requests', 50, NULL),
  ('starter', 'attendance_scans', 500, NULL),
  ('starter', 'storage_gb', 5, 0.50),
  ('starter', 'ai_queries', 0, 0.05),
  ('starter', 'performance_reviews', 0, NULL),
  -- Growth plan limits (50GB storage)
  ('growth', 'leave_requests', NULL, NULL),
  ('growth', 'attendance_scans', NULL, NULL),
  ('growth', 'storage_gb', 50, 0.50),
  ('growth', 'ai_queries', 100, 0.03),
  ('growth', 'performance_reviews', NULL, 2.00),
  -- Enterprise plan limits (unlimited)
  ('enterprise', 'leave_requests', NULL, NULL),
  ('enterprise', 'attendance_scans', NULL, NULL),
  ('enterprise', 'storage_gb', NULL, NULL),
  ('enterprise', 'ai_queries', NULL, NULL),
  ('enterprise', 'performance_reviews', NULL, NULL);

-- =====================================================
-- Create updated_at triggers
-- =====================================================

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- Create invoice number sequence function
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  new_invoice_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || current_year || '-%';
  
  new_invoice_number := 'INV-' || current_year || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_invoice_number;
END;
$$;