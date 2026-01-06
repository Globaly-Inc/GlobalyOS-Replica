-- Create super admin activity logs table for audit trail
CREATE TABLE public.super_admin_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by organization
CREATE INDEX idx_super_admin_activity_logs_org ON public.super_admin_activity_logs(organization_id);
CREATE INDEX idx_super_admin_activity_logs_created_at ON public.super_admin_activity_logs(created_at DESC);
CREATE INDEX idx_super_admin_activity_logs_action_type ON public.super_admin_activity_logs(action_type);

-- Enable RLS
ALTER TABLE public.super_admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can read activity logs
CREATE POLICY "Super admins can read activity logs"
ON public.super_admin_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Only super admins can insert activity logs
CREATE POLICY "Super admins can insert activity logs"
ON public.super_admin_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- Add comment for documentation
COMMENT ON TABLE public.super_admin_activity_logs IS 'Audit trail for all super admin actions on organizations';