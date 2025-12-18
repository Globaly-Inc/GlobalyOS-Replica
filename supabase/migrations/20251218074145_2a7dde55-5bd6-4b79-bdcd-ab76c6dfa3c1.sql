-- Add hierarchy columns to kpis table for Organisation KPIs and linked KPIs
ALTER TABLE kpis 
  ADD COLUMN IF NOT EXISTS parent_kpi_id uuid REFERENCES kpis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS child_contribution_weight numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS auto_rollup boolean DEFAULT false;

-- Drop existing constraint if it exists and recreate with organization scope
ALTER TABLE kpis DROP CONSTRAINT IF EXISTS kpis_scope_type_check;
ALTER TABLE kpis ADD CONSTRAINT kpis_scope_type_check 
  CHECK (scope_type IN ('individual', 'department', 'office', 'project', 'organization'));

-- Create index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_kpis_parent_id ON kpis(parent_kpi_id);

-- Create function to calculate rollup progress for parent KPIs
CREATE OR REPLACE FUNCTION calculate_kpi_rollup(parent_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_weighted_progress numeric := 0;
  total_weight numeric := 0;
  child_record RECORD;
BEGIN
  FOR child_record IN 
    SELECT current_value, target_value, child_contribution_weight
    FROM kpis 
    WHERE parent_kpi_id = parent_id 
      AND target_value IS NOT NULL 
      AND target_value > 0
  LOOP
    total_weighted_progress := total_weighted_progress + 
      (COALESCE(child_record.current_value, 0) / child_record.target_value * 100) * child_record.child_contribution_weight;
    total_weight := total_weight + child_record.child_contribution_weight;
  END LOOP;
  
  IF total_weight = 0 THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND(total_weighted_progress / total_weight, 2);
END;
$$;