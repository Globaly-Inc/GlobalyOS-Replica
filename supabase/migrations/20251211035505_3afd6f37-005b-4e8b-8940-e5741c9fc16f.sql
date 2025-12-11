-- Add policy for users to delete their own kudos
CREATE POLICY "Users can delete own kudos"
ON public.kudos
FOR DELETE
USING (
  given_by_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Add policy for users to update their own kudos
CREATE POLICY "Users can update own kudos"
ON public.kudos
FOR UPDATE
USING (
  given_by_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);