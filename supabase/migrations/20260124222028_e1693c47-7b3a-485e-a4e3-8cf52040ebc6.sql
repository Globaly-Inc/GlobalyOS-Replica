-- Phase 5: Drop Legacy leave_type_id Columns
-- Must drop trigger first, then column, then recreate trigger

-- 1. Drop the trigger that depends on leave_type_id
DROP TRIGGER IF EXISTS trg_sync_balance_from_log ON public.leave_balance_logs;

-- 2. Drop leave_type_id from leave_type_balances
ALTER TABLE public.leave_type_balances DROP COLUMN IF EXISTS leave_type_id;

-- 3. Drop leave_type_id from leave_balance_logs
ALTER TABLE public.leave_balance_logs DROP COLUMN IF EXISTS leave_type_id;

-- 4. Drop leave_type_id from leave_requests
ALTER TABLE public.leave_requests DROP COLUMN IF EXISTS leave_type_id;

-- 5. Drop the legacy junction table
DROP TABLE IF EXISTS public.leave_type_offices;

-- 6. Recreate sync_balance_from_log function (office_leave_type_id only)
CREATE OR REPLACE FUNCTION public.sync_balance_from_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.office_leave_type_id IS NOT NULL THEN
    INSERT INTO public.leave_type_balances (
      employee_id, 
      office_leave_type_id, 
      organization_id, 
      balance, 
      year
    )
    VALUES (
      NEW.employee_id, 
      NEW.office_leave_type_id, 
      NEW.organization_id, 
      NEW.new_balance, 
      COALESCE(NEW.year, EXTRACT(YEAR FROM CURRENT_DATE)::INT)
    )
    ON CONFLICT (employee_id, office_leave_type_id, year)
    DO UPDATE SET 
      balance = EXCLUDED.balance, 
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Recreate the trigger
CREATE TRIGGER trg_sync_balance_from_log
AFTER INSERT ON public.leave_balance_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_balance_from_log();

-- 8. Make office_leave_type_id NOT NULL in leave_type_balances
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM leave_type_balances WHERE office_leave_type_id IS NULL) THEN
    EXECUTE 'ALTER TABLE public.leave_type_balances ALTER COLUMN office_leave_type_id SET NOT NULL';
  END IF;
END $$;