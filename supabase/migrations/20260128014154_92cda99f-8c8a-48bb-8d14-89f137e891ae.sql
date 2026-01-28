-- Create table for super admin master codes
CREATE TABLE public.super_admin_master_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  use_count INTEGER DEFAULT 0,
  UNIQUE(target_user_id) -- One master code per user
);

-- Enable Row Level Security
ALTER TABLE public.super_admin_master_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only super admins can manage master codes
CREATE POLICY "Super admins can manage master codes"
ON public.super_admin_master_codes FOR ALL
USING (public.is_super_admin());

-- Indexes for performance
CREATE INDEX idx_master_codes_email ON public.super_admin_master_codes(target_email);
CREATE INDEX idx_master_codes_code ON public.super_admin_master_codes(code);
CREATE INDEX idx_master_codes_target_user ON public.super_admin_master_codes(target_user_id);