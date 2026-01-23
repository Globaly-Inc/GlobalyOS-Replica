-- Phase 2: Create email_delivery_log table for tracking all transactional emails

CREATE TABLE public.email_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,  -- 'invite', 'onboarding_complete', 'team_notification', 'reminder'
  recipient_email TEXT NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_name TEXT,
  status TEXT DEFAULT 'sent',  -- 'sent', 'delivered', 'failed', 'bounced'
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_email_delivery_log_org_id ON public.email_delivery_log(organization_id);
CREATE INDEX idx_email_delivery_log_employee_id ON public.email_delivery_log(employee_id);
CREATE INDEX idx_email_delivery_log_email_type ON public.email_delivery_log(email_type);
CREATE INDEX idx_email_delivery_log_sent_at ON public.email_delivery_log(sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS: Org owners/admins/HR can view logs for their organization
CREATE POLICY "email_logs_org_admin_view" ON public.email_delivery_log
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'hr')
  )
);

-- Allow service role to insert logs (edge functions)
CREATE POLICY "email_logs_service_insert" ON public.email_delivery_log
FOR INSERT
WITH CHECK (true);