-- Fix SELECT policies for updates and kudos (argument order was incorrect)
-- Incorrect: can_view_update(auth.uid(), id)
-- Correct:   can_view_update(id, auth.uid())

DROP POLICY IF EXISTS "Users can view accessible updates" ON public.updates;

CREATE POLICY "Users can view accessible updates"
ON public.updates
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_update(id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view accessible kudos" ON public.kudos;

CREATE POLICY "Users can view accessible kudos"
ON public.kudos
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_kudos(id, auth.uid())
);
