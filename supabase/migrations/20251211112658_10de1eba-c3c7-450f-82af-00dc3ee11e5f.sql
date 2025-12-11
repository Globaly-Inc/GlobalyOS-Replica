-- Fix achievements table - restrict to org members
DROP POLICY IF EXISTS "All authenticated users can view achievements" ON public.achievements;
CREATE POLICY "Org members can view achievements"
ON public.achievements FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Fix position_history table - sensitive data, restrict properly
DROP POLICY IF EXISTS "All authenticated users can view position history" ON public.position_history;

-- Users can view their own position history
CREATE POLICY "Users can view own position history"
ON public.position_history FOR SELECT
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Fix kudos table - restrict to org members
DROP POLICY IF EXISTS "All authenticated users can view kudos" ON public.kudos;
CREATE POLICY "Org members can view kudos"
ON public.kudos FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Fix profile_summaries table - restrict to org members
DROP POLICY IF EXISTS "All authenticated users can view profile summaries" ON public.profile_summaries;
CREATE POLICY "Org members can view profile summaries"
ON public.profile_summaries FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Fix updates table - restrict to org members
DROP POLICY IF EXISTS "All authenticated users can view updates" ON public.updates;
CREATE POLICY "Org members can view updates"
ON public.updates FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Fix positions table - restrict to org members
DROP POLICY IF EXISTS "All authenticated users can view positions" ON public.positions;
CREATE POLICY "Org members can view positions"
ON public.positions FOR SELECT
USING (is_org_member(auth.uid(), organization_id));