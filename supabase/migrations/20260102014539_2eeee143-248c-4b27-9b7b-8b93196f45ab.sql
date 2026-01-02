-- Fix leave requests where leave_type_id doesn't match leave_type name
-- This repairs corrupted data where the leave_type_id UUID points to wrong leave type
UPDATE leave_requests lr
SET leave_type_id = lt.id
FROM leave_types lt
WHERE lr.leave_type = lt.name
  AND lr.organization_id = lt.organization_id
  AND (lr.leave_type_id IS NULL OR lr.leave_type_id != lt.id);