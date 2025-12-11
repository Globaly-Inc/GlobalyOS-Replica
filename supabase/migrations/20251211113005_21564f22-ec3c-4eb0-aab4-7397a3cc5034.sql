-- Create a security definer function to check if current user manages an employee
CREATE OR REPLACE FUNCTION public.is_manager_of_employee(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = _employee_id
    AND e.manager_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
  )
$$;

-- Create a security definer function to check if employee belongs to current user
CREATE OR REPLACE FUNCTION public.is_own_employee(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = _employee_id AND user_id = auth.uid()
  )
$$;

-- Fix attendance_records policies
DROP POLICY IF EXISTS "Managers can view direct reports attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can check in for themselves" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_records;

CREATE POLICY "Users can view own attendance"
ON public.attendance_records FOR SELECT
USING (public.is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports attendance"
ON public.attendance_records FOR SELECT
USING (public.is_manager_of_employee(employee_id));

CREATE POLICY "Users can check in for themselves"
ON public.attendance_records FOR INSERT
WITH CHECK (public.is_own_employee(employee_id) AND date = CURRENT_DATE);

CREATE POLICY "Users can update own attendance"
ON public.attendance_records FOR UPDATE
USING (public.is_own_employee(employee_id) AND date = CURRENT_DATE);

-- Fix position_history policies
DROP POLICY IF EXISTS "Managers can view direct reports history" ON public.position_history;
DROP POLICY IF EXISTS "Users can view own position history" ON public.position_history;

CREATE POLICY "Users can view own position history"
ON public.position_history FOR SELECT
USING (public.is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports history"
ON public.position_history FOR SELECT
USING (public.is_manager_of_employee(employee_id));

-- Fix leave_requests policies
DROP POLICY IF EXISTS "Managers can view direct reports leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Managers can update direct reports leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can delete own pending leave requests" ON public.leave_requests;

CREATE POLICY "Users can view own leave requests"
ON public.leave_requests FOR SELECT
USING (public.is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports leave requests"
ON public.leave_requests FOR SELECT
USING (public.is_manager_of_employee(employee_id));

CREATE POLICY "Users can create own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (public.is_own_employee(employee_id));

CREATE POLICY "Managers can update direct reports leave requests"
ON public.leave_requests FOR UPDATE
USING (public.is_manager_of_employee(employee_id));

CREATE POLICY "Users can delete own pending leave requests"
ON public.leave_requests FOR DELETE
USING (public.is_own_employee(employee_id) AND status = 'pending');

-- Fix learning_development policies
DROP POLICY IF EXISTS "Managers can view direct reports learning records" ON public.learning_development;
DROP POLICY IF EXISTS "Users can view own learning records" ON public.learning_development;
DROP POLICY IF EXISTS "Users can insert own learning records" ON public.learning_development;
DROP POLICY IF EXISTS "Users can update own learning records" ON public.learning_development;

CREATE POLICY "Users can view own learning records"
ON public.learning_development FOR SELECT
USING (public.is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports learning records"
ON public.learning_development FOR SELECT
USING (public.is_manager_of_employee(employee_id));

CREATE POLICY "Users can insert own learning records"
ON public.learning_development FOR INSERT
WITH CHECK (public.is_own_employee(employee_id));

CREATE POLICY "Users can update own learning records"
ON public.learning_development FOR UPDATE
USING (public.is_own_employee(employee_id));

-- Fix leave_balances policies
DROP POLICY IF EXISTS "Managers can view direct reports leave balances" ON public.leave_balances;
DROP POLICY IF EXISTS "Users can view own leave balances" ON public.leave_balances;

CREATE POLICY "Users can view own leave balances"
ON public.leave_balances FOR SELECT
USING (public.is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports leave balances"
ON public.leave_balances FOR SELECT
USING (public.is_manager_of_employee(employee_id));

-- Fix leave_type_balances policies
DROP POLICY IF EXISTS "Managers can view direct reports leave type balances" ON public.leave_type_balances;
DROP POLICY IF EXISTS "Users can view own leave type balances" ON public.leave_type_balances;

CREATE POLICY "Users can view own leave type balances"
ON public.leave_type_balances FOR SELECT
USING (public.is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports leave type balances"
ON public.leave_type_balances FOR SELECT
USING (public.is_manager_of_employee(employee_id));

-- Fix leave_balance_logs policies
DROP POLICY IF EXISTS "Managers can view direct reports leave balance logs" ON public.leave_balance_logs;
DROP POLICY IF EXISTS "Users can view own leave balance logs" ON public.leave_balance_logs;

CREATE POLICY "Users can view own leave balance logs"
ON public.leave_balance_logs FOR SELECT
USING (public.is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports leave balance logs"
ON public.leave_balance_logs FOR SELECT
USING (public.is_manager_of_employee(employee_id));

-- Fix employee_documents policies
DROP POLICY IF EXISTS "Managers can view direct reports documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can view own documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can upload to personal folder" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can delete own personal documents" ON public.employee_documents;

CREATE POLICY "Users can view own documents"
ON public.employee_documents FOR SELECT
USING (public.is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports documents"
ON public.employee_documents FOR SELECT
USING (public.is_manager_of_employee(employee_id));

CREATE POLICY "Users can upload to personal folder"
ON public.employee_documents FOR INSERT
WITH CHECK (public.is_own_employee(employee_id) AND folder = 'personal');

CREATE POLICY "Users can delete own personal documents"
ON public.employee_documents FOR DELETE
USING (public.is_own_employee(employee_id) AND folder = 'personal');

-- Fix kudos policies
DROP POLICY IF EXISTS "Users can give kudos as themselves" ON public.kudos;
DROP POLICY IF EXISTS "Users can update own kudos" ON public.kudos;
DROP POLICY IF EXISTS "Users can delete own kudos" ON public.kudos;

CREATE POLICY "Users can give kudos as themselves"
ON public.kudos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND public.is_own_employee(given_by_id));

CREATE POLICY "Users can update own kudos"
ON public.kudos FOR UPDATE
USING (public.is_own_employee(given_by_id));

CREATE POLICY "Users can delete own kudos"
ON public.kudos FOR DELETE
USING (public.is_own_employee(given_by_id));

-- Fix updates policies
DROP POLICY IF EXISTS "Users can post updates as themselves" ON public.updates;
DROP POLICY IF EXISTS "Users can update own updates" ON public.updates;
DROP POLICY IF EXISTS "Users can delete own updates" ON public.updates;

CREATE POLICY "Users can post updates as themselves"
ON public.updates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND public.is_own_employee(employee_id));

CREATE POLICY "Users can update own updates"
ON public.updates FOR UPDATE
USING (public.is_own_employee(employee_id));

CREATE POLICY "Users can delete own updates"
ON public.updates FOR DELETE
USING (public.is_own_employee(employee_id));

-- Fix feed_reactions policies
DROP POLICY IF EXISTS "Users can add reactions" ON public.feed_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.feed_reactions;

CREATE POLICY "Users can add reactions"
ON public.feed_reactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND public.is_own_employee(employee_id));

CREATE POLICY "Users can remove their own reactions"
ON public.feed_reactions FOR DELETE
USING (public.is_own_employee(employee_id));

-- Fix update_mentions policies
DROP POLICY IF EXISTS "Users can add mentions to own updates" ON public.update_mentions;
DROP POLICY IF EXISTS "Users can delete mentions from own updates" ON public.update_mentions;