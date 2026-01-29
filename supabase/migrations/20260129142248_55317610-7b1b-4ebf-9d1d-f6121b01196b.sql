-- Add UPDATE policy for chat_favorites to allow users to update their own favorites (sort_order)
CREATE POLICY "Users can update own favorites" 
ON public.chat_favorites 
FOR UPDATE 
USING (
  employee_id = (
    SELECT employees.id FROM employees 
    WHERE employees.user_id = auth.uid() 
    AND employees.organization_id = chat_favorites.organization_id
  )
)
WITH CHECK (
  employee_id = (
    SELECT employees.id FROM employees 
    WHERE employees.user_id = auth.uid() 
    AND employees.organization_id = chat_favorites.organization_id
  )
);