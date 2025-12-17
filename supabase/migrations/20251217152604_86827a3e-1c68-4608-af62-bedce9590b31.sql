-- Update achievements policies to include owner
DROP POLICY IF EXISTS "Admins can delete achievements" ON achievements;
CREATE POLICY "Owner and admins can delete achievements"
ON achievements FOR DELETE
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "HR and admins can create achievements" ON achievements;
CREATE POLICY "Owner, HR and admins can create achievements"
ON achievements FOR INSERT
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "HR and admins can update achievements" ON achievements;
CREATE POLICY "Owner, HR and admins can update achievements"
ON achievements FOR UPDATE
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update ai_knowledge_settings to include owner
DROP POLICY IF EXISTS "Admins can manage AI settings" ON ai_knowledge_settings;
CREATE POLICY "Owner and admins can manage AI settings"
ON ai_knowledge_settings FOR ALL
USING ((has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND is_org_member(auth.uid(), organization_id))
WITH CHECK ((has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND is_org_member(auth.uid(), organization_id));

-- Update attendance_hour_balances to include owner
DROP POLICY IF EXISTS "HR and admins can manage hour balances" ON attendance_hour_balances;
CREATE POLICY "Owner, HR and admins can manage hour balances"
ON attendance_hour_balances FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update attendance_leave_adjustments to include owner
DROP POLICY IF EXISTS "HR and admins can manage adjustments" ON attendance_leave_adjustments;
CREATE POLICY "Owner, HR and admins can manage adjustments"
ON attendance_leave_adjustments FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update attendance_records to include owner
DROP POLICY IF EXISTS "HR and admins can manage all attendance" ON attendance_records;
CREATE POLICY "Owner, HR and admins can manage all attendance"
ON attendance_records FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "HR and admins can view all attendance" ON attendance_records;
CREATE POLICY "Owner, HR and admins can view all attendance"
ON attendance_records FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update calendar_event_offices to include owner
DROP POLICY IF EXISTS "HR and admins can manage calendar event offices" ON calendar_event_offices;
CREATE POLICY "Owner, HR and admins can manage calendar event offices"
ON calendar_event_offices FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update calendar_events to include owner
DROP POLICY IF EXISTS "HR and admins can manage calendar events" ON calendar_events;
CREATE POLICY "Owner, HR and admins can manage calendar events"
ON calendar_events FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));