-- Add SELECT policy to allow space creators to view their own spaces
-- This fixes the RETURNING clause issue during INSERT for private spaces
CREATE POLICY "Space creators can view their own spaces"
ON public.chat_spaces
FOR SELECT
TO authenticated
USING (
  created_by IN (
    SELECT id FROM employees 
    WHERE user_id = auth.uid()
  )
);

-- Fix the INSERT policy with correct column qualification
DROP POLICY IF EXISTS "Org members can create spaces" ON public.chat_spaces;

CREATE POLICY "Org members can create spaces"
ON public.chat_spaces
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = chat_spaces.organization_id
    AND e.id = chat_spaces.created_by
    AND e.status = 'active'
  )
);