-- Allow all authenticated users to view position history (salary filtering is handled in frontend)
CREATE POLICY "All authenticated users can view position history"
ON public.position_history
FOR SELECT
USING (auth.uid() IS NOT NULL);