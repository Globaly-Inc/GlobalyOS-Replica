-- Create support request type and status enums
CREATE TYPE public.support_request_type AS ENUM ('bug', 'feature');
CREATE TYPE public.support_request_status AS ENUM ('new', 'triaging', 'in_progress', 'resolved', 'closed', 'wont_fix');
CREATE TYPE public.support_request_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create support_requests table
CREATE TABLE public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.support_request_type NOT NULL DEFAULT 'bug',
  status public.support_request_status NOT NULL DEFAULT 'new',
  priority public.support_request_priority NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_improved_description TEXT,
  page_url TEXT NOT NULL,
  browser_info TEXT NOT NULL,
  device_type TEXT NOT NULL,
  screenshot_url TEXT,
  admin_notes TEXT,
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own requests
CREATE POLICY "Users can create own support requests"
ON public.support_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own support requests"
ON public.support_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins can view all requests
CREATE POLICY "Super admins can view all support requests"
ON public.support_requests
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admins can update all requests
CREATE POLICY "Super admins can update all support requests"
ON public.support_requests
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admins can delete requests
CREATE POLICY "Super admins can delete support requests"
ON public.support_requests
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-screenshots', 'support-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for support screenshots
CREATE POLICY "Authenticated users can upload support screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-screenshots');

CREATE POLICY "Anyone can view support screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'support-screenshots');

-- Enable realtime for support_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests;