-- Create a function to check if user owns an update
CREATE OR REPLACE FUNCTION public.owns_update(_update_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.updates u
    JOIN public.employees e ON e.id = u.employee_id
    WHERE u.id = _update_id AND e.user_id = auth.uid()
  )
$$;

-- Recreate update_mentions policies
CREATE POLICY "Users can add mentions to own updates"
ON public.update_mentions FOR INSERT
WITH CHECK (public.owns_update(update_id));

CREATE POLICY "Users can delete mentions from own updates"
ON public.update_mentions FOR DELETE
USING (public.owns_update(update_id));