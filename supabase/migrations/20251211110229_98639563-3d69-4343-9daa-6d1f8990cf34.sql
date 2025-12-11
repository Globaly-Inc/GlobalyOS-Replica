-- Add ip_address column to otp_codes for IP-based rate limiting
ALTER TABLE public.otp_codes ADD COLUMN IF NOT EXISTS ip_address text;

-- Add failed_attempts column to track verification failures
ALTER TABLE public.otp_codes ADD COLUMN IF NOT EXISTS failed_attempts integer DEFAULT 0;

-- Create index for IP-based queries
CREATE INDEX IF NOT EXISTS idx_otp_codes_ip_address ON public.otp_codes(ip_address);
CREATE INDEX IF NOT EXISTS idx_otp_codes_created_at ON public.otp_codes(created_at);