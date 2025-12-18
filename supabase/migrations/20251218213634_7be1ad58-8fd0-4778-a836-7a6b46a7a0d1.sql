-- Enable RLS on support_screenshot_routes table
ALTER TABLE public.support_screenshot_routes ENABLE ROW LEVEL SECURITY;

-- Allow super admins to manage routes
CREATE POLICY "Super admins can manage screenshot routes"
ON public.support_screenshot_routes
FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Allow authenticated users to read active routes (for edge functions)
CREATE POLICY "Authenticated users can view active routes"
ON public.support_screenshot_routes
FOR SELECT
USING (is_active = true);