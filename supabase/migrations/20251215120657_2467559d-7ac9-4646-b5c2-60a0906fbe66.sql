-- Create feature flags table for per-organization feature access
CREATE TABLE public.organization_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, feature_name)
);

-- Enable RLS
ALTER TABLE public.organization_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view their feature flags"
ON public.organization_features
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Super admins can manage all feature flags"
ON public.organization_features
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create a security definer function to check if a feature is enabled for an org
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_org_id uuid, _feature_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.organization_features 
     WHERE organization_id = _org_id AND feature_name = _feature_name),
    false
  )
$$;

-- Insert initial feature flags for GlobalyHub (enable Chat, Tasks, CRM)
INSERT INTO public.organization_features (organization_id, feature_name, is_enabled)
SELECT '11111111-1111-1111-1111-111111111111', feature_name, true
FROM unnest(ARRAY['chat', 'tasks', 'crm']) AS feature_name
ON CONFLICT (organization_id, feature_name) DO UPDATE SET is_enabled = true;

-- Add index for fast lookups
CREATE INDEX idx_organization_features_lookup ON public.organization_features(organization_id, feature_name);

-- Add realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_features;