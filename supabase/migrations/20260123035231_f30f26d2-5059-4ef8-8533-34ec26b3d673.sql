-- =====================================================
-- Leave Balance Deduction Trigger
-- Automatically deducts leave balance when request is approved
-- =====================================================

-- Function to handle leave request approval and deduct balance
CREATE OR REPLACE FUNCTION public.handle_leave_request_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
  v_office_id UUID;
  v_leave_type_name TEXT;
  v_days_count NUMERIC;
  v_request_year INT;
  v_office_leave_type_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_balance_id UUID;
  v_creator_employee_id UUID;
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    v_employee_id := NEW.employee_id;
    v_leave_type_name := NEW.leave_type;
    v_days_count := NEW.days_count;
    v_request_year := EXTRACT(YEAR FROM NEW.start_date::date);
    
    -- Get employee's office
    SELECT office_id INTO v_office_id
    FROM employees
    WHERE id = v_employee_id;
    
    IF v_office_id IS NULL THEN
      RAISE NOTICE 'Employee % has no office assigned, skipping balance deduction', v_employee_id;
      RETURN NEW;
    END IF;
    
    -- Find the matching office_leave_type
    SELECT id INTO v_office_leave_type_id
    FROM office_leave_types
    WHERE office_id = v_office_id
      AND LOWER(name) = LOWER(v_leave_type_name)
      AND is_active = true
    LIMIT 1;
    
    -- Fallback to legacy leave_types if no office leave type found
    IF v_office_leave_type_id IS NULL THEN
      -- Try to find via leave_types table (legacy)
      DECLARE
        v_legacy_leave_type_id UUID;
      BEGIN
        SELECT id INTO v_legacy_leave_type_id
        FROM leave_types
        WHERE organization_id = NEW.organization_id
          AND LOWER(name) = LOWER(v_leave_type_name)
        LIMIT 1;
        
        IF v_legacy_leave_type_id IS NOT NULL THEN
          -- Find or create balance using legacy leave_type_id
          SELECT id, balance INTO v_balance_id, v_current_balance
          FROM leave_type_balances
          WHERE employee_id = v_employee_id
            AND leave_type_id = v_legacy_leave_type_id
            AND year = v_request_year;
          
          IF v_balance_id IS NOT NULL THEN
            v_new_balance := v_current_balance - v_days_count;
            
            UPDATE leave_type_balances
            SET balance = v_new_balance,
                updated_at = NOW()
            WHERE id = v_balance_id;
            
            -- Get reviewer employee ID for logging
            v_creator_employee_id := NEW.reviewed_by;
            
            -- Create log entry
            INSERT INTO leave_balance_logs (
              employee_id,
              organization_id,
              leave_type,
              leave_type_id,
              change_amount,
              previous_balance,
              new_balance,
              reason,
              created_by,
              effective_date,
              action,
              year
            ) VALUES (
              v_employee_id,
              NEW.organization_id,
              v_leave_type_name,
              v_legacy_leave_type_id,
              -v_days_count,
              v_current_balance,
              v_new_balance,
              'Leave request approved: ' || NEW.start_date || ' to ' || NEW.end_date,
              COALESCE(v_creator_employee_id, v_employee_id),
              NEW.start_date,
              'leave_taken',
              v_request_year
            );
            
            RAISE NOTICE 'Deducted % days from legacy balance for employee %', v_days_count, v_employee_id;
          END IF;
        END IF;
        
        RETURN NEW;
      END;
    END IF;
    
    -- Find the balance record for this office leave type
    SELECT id, balance INTO v_balance_id, v_current_balance
    FROM leave_type_balances
    WHERE employee_id = v_employee_id
      AND office_leave_type_id = v_office_leave_type_id
      AND year = v_request_year;
    
    IF v_balance_id IS NULL THEN
      -- No balance exists, create one with negative value
      v_current_balance := 0;
      v_new_balance := -v_days_count;
      
      INSERT INTO leave_type_balances (
        employee_id,
        organization_id,
        office_leave_type_id,
        balance,
        year
      ) VALUES (
        v_employee_id,
        NEW.organization_id,
        v_office_leave_type_id,
        v_new_balance,
        v_request_year
      )
      RETURNING id INTO v_balance_id;
    ELSE
      -- Update existing balance
      v_new_balance := v_current_balance - v_days_count;
      
      UPDATE leave_type_balances
      SET balance = v_new_balance,
          updated_at = NOW()
      WHERE id = v_balance_id;
    END IF;
    
    -- Get reviewer employee ID for logging
    v_creator_employee_id := NEW.reviewed_by;
    
    -- Create log entry for balance deduction
    INSERT INTO leave_balance_logs (
      employee_id,
      organization_id,
      leave_type,
      office_leave_type_id,
      change_amount,
      previous_balance,
      new_balance,
      reason,
      created_by,
      effective_date,
      action,
      year
    ) VALUES (
      v_employee_id,
      NEW.organization_id,
      v_leave_type_name,
      v_office_leave_type_id,
      -v_days_count,
      v_current_balance,
      v_new_balance,
      'Leave request approved: ' || NEW.start_date || ' to ' || NEW.end_date,
      COALESCE(v_creator_employee_id, v_employee_id),
      NEW.start_date,
      'leave_taken',
      v_request_year
    );
    
    RAISE NOTICE 'Deducted % days from balance for employee %, new balance: %', v_days_count, v_employee_id, v_new_balance;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_leave_request_approval ON leave_requests;

-- Create trigger on leave_requests table
CREATE TRIGGER trigger_leave_request_approval
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_leave_request_approval();

-- Also handle insert with status = 'approved' (for admin direct approvals)
DROP TRIGGER IF EXISTS trigger_leave_request_approval_insert ON leave_requests;

CREATE TRIGGER trigger_leave_request_approval_insert
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION handle_leave_request_approval();

-- =====================================================
-- Leave Balance Restoration Trigger
-- Restores balance when approved leave is cancelled/rejected
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_leave_request_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
  v_office_id UUID;
  v_leave_type_name TEXT;
  v_days_count NUMERIC;
  v_request_year INT;
  v_office_leave_type_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_balance_id UUID;
  v_creator_employee_id UUID;
BEGIN
  -- Only process when status changes FROM 'approved' to something else
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    v_employee_id := NEW.employee_id;
    v_leave_type_name := NEW.leave_type;
    v_days_count := NEW.days_count;
    v_request_year := EXTRACT(YEAR FROM NEW.start_date::date);
    
    -- Get employee's office
    SELECT office_id INTO v_office_id
    FROM employees
    WHERE id = v_employee_id;
    
    IF v_office_id IS NOT NULL THEN
      -- Find the matching office_leave_type
      SELECT id INTO v_office_leave_type_id
      FROM office_leave_types
      WHERE office_id = v_office_id
        AND LOWER(name) = LOWER(v_leave_type_name)
        AND is_active = true
      LIMIT 1;
    END IF;
    
    IF v_office_leave_type_id IS NOT NULL THEN
      -- Find the balance record
      SELECT id, balance INTO v_balance_id, v_current_balance
      FROM leave_type_balances
      WHERE employee_id = v_employee_id
        AND office_leave_type_id = v_office_leave_type_id
        AND year = v_request_year;
      
      IF v_balance_id IS NOT NULL THEN
        v_new_balance := v_current_balance + v_days_count;
        
        UPDATE leave_type_balances
        SET balance = v_new_balance,
            updated_at = NOW()
        WHERE id = v_balance_id;
        
        -- Get reviewer employee ID for logging
        v_creator_employee_id := COALESCE(NEW.reviewed_by, OLD.reviewed_by);
        
        -- Create log entry for balance restoration
        INSERT INTO leave_balance_logs (
          employee_id,
          organization_id,
          leave_type,
          office_leave_type_id,
          change_amount,
          previous_balance,
          new_balance,
          reason,
          created_by,
          effective_date,
          action,
          year
        ) VALUES (
          v_employee_id,
          NEW.organization_id,
          v_leave_type_name,
          v_office_leave_type_id,
          v_days_count,
          v_current_balance,
          v_new_balance,
          'Leave cancelled/rejected: ' || NEW.start_date || ' to ' || NEW.end_date,
          COALESCE(v_creator_employee_id, v_employee_id),
          NEW.start_date,
          'leave_cancelled',
          v_request_year
        );
        
        RAISE NOTICE 'Restored % days to balance for employee %, new balance: %', v_days_count, v_employee_id, v_new_balance;
      END IF;
    ELSE
      -- Fallback to legacy leave_types
      DECLARE
        v_legacy_leave_type_id UUID;
      BEGIN
        SELECT id INTO v_legacy_leave_type_id
        FROM leave_types
        WHERE organization_id = NEW.organization_id
          AND LOWER(name) = LOWER(v_leave_type_name)
        LIMIT 1;
        
        IF v_legacy_leave_type_id IS NOT NULL THEN
          SELECT id, balance INTO v_balance_id, v_current_balance
          FROM leave_type_balances
          WHERE employee_id = v_employee_id
            AND leave_type_id = v_legacy_leave_type_id
            AND year = v_request_year;
          
          IF v_balance_id IS NOT NULL THEN
            v_new_balance := v_current_balance + v_days_count;
            
            UPDATE leave_type_balances
            SET balance = v_new_balance,
                updated_at = NOW()
            WHERE id = v_balance_id;
            
            v_creator_employee_id := COALESCE(NEW.reviewed_by, OLD.reviewed_by);
            
            INSERT INTO leave_balance_logs (
              employee_id,
              organization_id,
              leave_type,
              leave_type_id,
              change_amount,
              previous_balance,
              new_balance,
              reason,
              created_by,
              effective_date,
              action,
              year
            ) VALUES (
              v_employee_id,
              NEW.organization_id,
              v_leave_type_name,
              v_legacy_leave_type_id,
              v_days_count,
              v_current_balance,
              v_new_balance,
              'Leave cancelled/rejected: ' || NEW.start_date || ' to ' || NEW.end_date,
              COALESCE(v_creator_employee_id, v_employee_id),
              NEW.start_date,
              'leave_cancelled',
              v_request_year
            );
            
            RAISE NOTICE 'Restored % days to legacy balance for employee %', v_days_count, v_employee_id;
          END IF;
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_leave_request_cancellation ON leave_requests;

-- Create trigger for cancellation
CREATE TRIGGER trigger_leave_request_cancellation
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_leave_request_cancellation();