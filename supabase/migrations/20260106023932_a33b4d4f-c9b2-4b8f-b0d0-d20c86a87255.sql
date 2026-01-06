-- Create usage_alerts table to track sent notifications
CREATE TABLE public.usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  threshold_percent INT NOT NULL CHECK (threshold_percent IN (80, 100)),
  billing_period_start TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, feature, threshold_percent, billing_period_start)
);

-- Enable RLS
ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for super-admins only
CREATE POLICY "Super admins can manage usage alerts"
ON public.usage_alerts
FOR ALL
USING (is_super_admin());

-- Create index for faster lookups
CREATE INDEX idx_usage_alerts_org_period ON public.usage_alerts(organization_id, billing_period_start);
CREATE INDEX idx_usage_alerts_feature ON public.usage_alerts(feature);