-- Allow admins and HR to delete kudos
CREATE POLICY "HR and admins can delete kudos" 
ON public.kudos 
FOR DELETE 
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow admins and HR to update kudos
CREATE POLICY "HR and admins can update kudos" 
ON public.kudos 
FOR UPDATE 
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow admins and HR to delete any updates
CREATE POLICY "HR and admins can delete updates" 
ON public.updates 
FOR DELETE 
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow admins and HR to update any updates
CREATE POLICY "HR and admins can update updates" 
ON public.updates 
FOR UPDATE 
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));