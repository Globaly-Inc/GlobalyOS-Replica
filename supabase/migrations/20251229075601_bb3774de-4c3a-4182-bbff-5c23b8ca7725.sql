-- Add is_current column to position_history
ALTER TABLE public.position_history ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT false;

-- Create unique index to ensure only ONE current position per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_position_history_single_current 
ON public.position_history (employee_id) WHERE is_current = true;

-- Create function to sync employee table when position_history changes
CREATE OR REPLACE FUNCTION public.sync_employee_position_from_history()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a position is marked as current, update the employees table
  IF NEW.is_current = true THEN
    UPDATE employees SET
      position = NEW.position,
      department = NEW.department,
      employment_type = NEW.employment_type,
      remuneration = NEW.salary,
      position_effective_date = NEW.effective_date
    WHERE id = NEW.employee_id;
    
    -- Close any other current positions for this employee
    UPDATE position_history SET
      is_current = false,
      end_date = COALESCE(end_date, NEW.effective_date - INTERVAL '1 day')
    WHERE employee_id = NEW.employee_id 
      AND id != NEW.id 
      AND is_current = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync on insert or update
DROP TRIGGER IF EXISTS sync_employee_position_trigger ON public.position_history;
CREATE TRIGGER sync_employee_position_trigger
AFTER INSERT OR UPDATE ON public.position_history
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_position_from_history();

-- Migrate existing data: set is_current for the most recent position per employee
-- First, set is_current = true for the most recent position (by effective_date) per employee
-- that doesn't have an end_date
WITH latest_positions AS (
  SELECT DISTINCT ON (employee_id) id
  FROM position_history
  WHERE end_date IS NULL
  ORDER BY employee_id, effective_date DESC
)
UPDATE position_history 
SET is_current = true
WHERE id IN (SELECT id FROM latest_positions);

-- For positions that have end_date set, ensure is_current is false
UPDATE position_history 
SET is_current = false
WHERE end_date IS NOT NULL AND is_current = true;

-- Set end_dates for historical positions that don't have them
-- Calculate based on the next position's effective_date
WITH position_dates AS (
  SELECT 
    ph.id,
    ph.employee_id,
    ph.effective_date,
    LEAD(ph.effective_date) OVER (PARTITION BY ph.employee_id ORDER BY ph.effective_date) - INTERVAL '1 day' as calculated_end_date
  FROM position_history ph
  WHERE ph.is_current = false OR ph.is_current IS NULL
)
UPDATE position_history ph
SET end_date = pd.calculated_end_date
FROM position_dates pd
WHERE ph.id = pd.id
  AND ph.end_date IS NULL
  AND pd.calculated_end_date IS NOT NULL;