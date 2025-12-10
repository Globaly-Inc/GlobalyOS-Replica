-- Create function to automatically allocate default leave balances for new employees
CREATE OR REPLACE FUNCTION public.allocate_default_leave_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert leave_type_balances for all active leave types in the organization
  INSERT INTO public.leave_type_balances (employee_id, leave_type_id, organization_id, balance, year)
  SELECT 
    NEW.id,
    lt.id,
    NEW.organization_id,
    COALESCE(lt.default_days, 0),
    EXTRACT(year FROM CURRENT_DATE)::integer
  FROM public.leave_types lt
  WHERE lt.organization_id = NEW.organization_id
    AND lt.is_active = true
    AND (lt.applies_to_all_offices = true OR EXISTS (
      SELECT 1 FROM public.leave_type_offices lto 
      WHERE lto.leave_type_id = lt.id AND lto.office_id = NEW.office_id
    ))
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after employee insert
CREATE TRIGGER on_employee_created_allocate_leave
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.allocate_default_leave_balances();