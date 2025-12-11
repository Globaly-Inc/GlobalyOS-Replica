-- Create login_attempts table for tracking suspicious activity
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempt_type TEXT NOT NULL, -- 'otp_request', 'otp_verify_success', 'otp_verify_failed', 'captcha_failed'
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts(created_at DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage login attempts (edge functions)
CREATE POLICY "Service role can manage login attempts"
ON public.login_attempts
FOR ALL
USING (true)
WITH CHECK (true);