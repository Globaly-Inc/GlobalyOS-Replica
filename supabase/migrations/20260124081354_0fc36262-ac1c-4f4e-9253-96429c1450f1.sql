-- Phase 1.1: Fix remaining leave_type_balances records (2 records)
UPDATE leave_type_balances
SET office_leave_type_id = subq.olt_id
FROM (
  SELECT ltb.id as balance_id, olt.id as olt_id
  FROM leave_type_balances ltb
  JOIN leave_types lt ON lt.id = ltb.leave_type_id
  JOIN employees e ON e.id = ltb.employee_id
  JOIN office_leave_types olt ON LOWER(olt.name) = LOWER(lt.name) AND olt.office_id = e.office_id
  WHERE ltb.office_leave_type_id IS NULL
) subq
WHERE leave_type_balances.id = subq.balance_id;

-- Phase 1.2: Add office_leave_type_id column to leave_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leave_requests' 
    AND column_name = 'office_leave_type_id'
  ) THEN
    ALTER TABLE leave_requests 
    ADD COLUMN office_leave_type_id UUID REFERENCES office_leave_types(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_leave_requests_office_leave_type_id 
    ON leave_requests(office_leave_type_id);
  END IF;
END $$;

-- Backfill office_leave_type_id for all leave_requests
UPDATE leave_requests
SET office_leave_type_id = subq.olt_id
FROM (
  SELECT lr.id as request_id, olt.id as olt_id
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  JOIN office_leave_types olt ON olt.office_id = e.office_id 
    AND LOWER(olt.name) = LOWER(lr.leave_type)
    AND olt.is_active = true
  WHERE lr.office_leave_type_id IS NULL
) subq
WHERE leave_requests.id = subq.request_id;

-- Phase 2.1: Update allocate_default_leave_balances trigger to use office_leave_types
CREATE OR REPLACE FUNCTION allocate_default_leave_balances()
RETURNS TRIGGER AS $$
DECLARE
  current_year INTEGER;
BEGIN
  current_year := EXTRACT(year FROM CURRENT_DATE)::integer;
  
  IF NEW.office_id IS NOT NULL THEN
    INSERT INTO leave_type_balances (
      employee_id, office_leave_type_id, organization_id, balance, year
    )
    SELECT 
      NEW.id,
      olt.id,
      NEW.organization_id,
      COALESCE(olt.default_days, 0),
      current_year
    FROM office_leave_types olt
    WHERE olt.office_id = NEW.office_id
      AND olt.is_active = true
      AND (olt.applies_to_gender = 'all' OR olt.applies_to_gender = NEW.gender)
      AND (olt.applies_to_employment_types IS NULL 
           OR NEW.employment_type = ANY(olt.applies_to_employment_types))
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 2.2: Update sync_balance_from_log
CREATE OR REPLACE FUNCTION sync_balance_from_log()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_balance_id UUID;
BEGIN
  v_year := COALESCE(NEW.year, EXTRACT(YEAR FROM COALESCE(NEW.effective_date, NEW.created_at))::INTEGER);
  
  IF NEW.office_leave_type_id IS NOT NULL THEN
    SELECT id INTO v_balance_id
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND office_leave_type_id = NEW.office_leave_type_id
      AND year = v_year;
    
    IF v_balance_id IS NULL THEN
      INSERT INTO leave_type_balances (
        employee_id, office_leave_type_id, organization_id, balance, year
      ) VALUES (
        NEW.employee_id, NEW.office_leave_type_id, NEW.organization_id, NEW.new_balance, v_year
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_balance_id;
    ELSE
      UPDATE leave_type_balances
      SET balance = NEW.new_balance, updated_at = NOW()
      WHERE id = v_balance_id;
    END IF;
  ELSIF NEW.leave_type_id IS NOT NULL THEN
    SELECT id INTO v_balance_id
    FROM leave_type_balances
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = v_year;
    
    IF v_balance_id IS NULL THEN
      INSERT INTO leave_type_balances (
        employee_id, leave_type_id, organization_id, balance, year
      ) VALUES (
        NEW.employee_id, NEW.leave_type_id, NEW.organization_id, NEW.new_balance, v_year
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_balance_id;
    ELSE
      UPDATE leave_type_balances
      SET balance = NEW.new_balance, updated_at = NOW()
      WHERE id = v_balance_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 2.3: Update handle_leave_request_balance trigger
CREATE OR REPLACE FUNCTION handle_leave_request_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_year INT;
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
  v_office_leave_type_id UUID;
BEGIN
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  v_year := EXTRACT(YEAR FROM COALESCE(NEW.start_date, OLD.start_date)::DATE);

  -- CASE 1: Leave request approved - deduct balance
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    
    v_office_leave_type_id := NEW.office_leave_type_id;
    
    IF v_office_leave_type_id IS NULL AND NEW.leave_type IS NOT NULL THEN
      SELECT olt.id INTO v_office_leave_type_id
      FROM office_leave_types olt
      JOIN employees e ON e.office_id = olt.office_id
      WHERE e.id = NEW.employee_id
        AND LOWER(olt.name) = LOWER(NEW.leave_type)
        AND olt.is_active = true
      LIMIT 1;
    END IF;
    
    IF v_office_leave_type_id IS NOT NULL THEN
      SELECT COALESCE(balance, 0) INTO v_old_balance
      FROM leave_type_balances
      WHERE employee_id = NEW.employee_id
        AND office_leave_type_id = v_office_leave_type_id
        AND year = v_year
      LIMIT 1;
    ELSIF NEW.leave_type_id IS NOT NULL THEN
      SELECT COALESCE(balance, 0) INTO v_old_balance
      FROM leave_type_balances
      WHERE employee_id = NEW.employee_id
        AND leave_type_id = NEW.leave_type_id
        AND year = v_year
      LIMIT 1;
    END IF;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    v_new_balance := v_old_balance - NEW.days_count;
    
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id, office_leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type, NEW.leave_type_id, v_office_leave_type_id,
      -NEW.days_count, v_old_balance, v_new_balance,
      'Leave request approved: ' || COALESCE(NEW.leave_type, 'Unknown') || ' (' || NEW.start_date || ' to ' || NEW.end_date || ')',
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_approved', v_year
    );
    
    RETURN NEW;
  END IF;

  -- CASE 2: Leave request rejected/cancelled after approval - restore balance
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status IN ('rejected', 'cancelled') THEN
    
    v_office_leave_type_id := NEW.office_leave_type_id;
    
    IF v_office_leave_type_id IS NULL AND NEW.leave_type IS NOT NULL THEN
      SELECT olt.id INTO v_office_leave_type_id
      FROM office_leave_types olt
      JOIN employees e ON e.office_id = olt.office_id
      WHERE e.id = NEW.employee_id
        AND LOWER(olt.name) = LOWER(NEW.leave_type)
        AND olt.is_active = true
      LIMIT 1;
    END IF;
    
    IF v_office_leave_type_id IS NOT NULL THEN
      SELECT COALESCE(balance, 0) INTO v_old_balance
      FROM leave_type_balances
      WHERE employee_id = NEW.employee_id
        AND office_leave_type_id = v_office_leave_type_id
        AND year = v_year;
    ELSIF NEW.leave_type_id IS NOT NULL THEN
      SELECT COALESCE(balance, 0) INTO v_old_balance
      FROM leave_type_balances
      WHERE employee_id = NEW.employee_id
        AND leave_type_id = NEW.leave_type_id
        AND year = v_year;
    END IF;
    
    v_old_balance := COALESCE(v_old_balance, 0);
    v_new_balance := v_old_balance + OLD.days_count;
    
    INSERT INTO leave_balance_logs (
      employee_id, organization_id, leave_type, leave_type_id, office_leave_type_id,
      change_amount, previous_balance, new_balance,
      reason, created_by, leave_request_id, action, year
    ) VALUES (
      NEW.employee_id, v_org_id, NEW.leave_type, NEW.leave_type_id, v_office_leave_type_id,
      OLD.days_count, v_old_balance, v_new_balance,
      'Leave request ' || NEW.status || ': ' || COALESCE(NEW.leave_type, 'Unknown') || ' (' || NEW.start_date || ' to ' || NEW.end_date || ')',
      COALESCE(NEW.reviewed_by, NEW.employee_id), NEW.id, 'leave_' || NEW.status, v_year
    );
    
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;