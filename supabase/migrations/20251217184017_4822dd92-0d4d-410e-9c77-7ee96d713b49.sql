-- Fix the policy that already exists by dropping and recreating
DROP POLICY IF EXISTS "HR and admins can manage all KPIs" ON public.kpis;

CREATE POLICY "HR and admins can manage all KPIs" ON public.kpis
FOR ALL USING (
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'owner'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'owner'::app_role)
);