-- Backfill office_id on existing leave_requests based on employee's current office
UPDATE leave_requests lr
SET office_id = e.office_id
FROM employees e
WHERE lr.employee_id = e.id
  AND lr.office_id IS NULL
  AND e.office_id IS NOT NULL;

-- Create index for faster queries by office
CREATE INDEX IF NOT EXISTS idx_leave_requests_office_id ON leave_requests(office_id);

-- Backfill leave_type_id on leave_requests using a subquery approach
UPDATE leave_requests
SET leave_type_id = (
  SELECT olt.id
  FROM employees e
  JOIN office_leave_types olt ON olt.office_id = e.office_id 
    AND LOWER(olt.name) = LOWER(leave_requests.leave_type)
  WHERE e.id = leave_requests.employee_id
  LIMIT 1
)
WHERE leave_type_id IS NULL
  AND office_id IS NOT NULL;