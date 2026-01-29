-- Create secure function to return birthday calendar data
-- Returns only month/day for birthdays (not full DOB including year)
-- This prevents age/exact birth date exposure via API responses

CREATE OR REPLACE FUNCTION public.get_birthday_calendar_data(org_id uuid)
RETURNS TABLE (
  employee_id uuid,
  full_name text,
  avatar_url text,
  birthday_month_day text,
  join_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is org member
  IF NOT is_org_member(auth.uid(), org_id) THEN
    RAISE EXCEPTION 'Not authorized to view this organization data';
  END IF;

  RETURN QUERY
  SELECT 
    e.id AS employee_id,
    p.full_name,
    p.avatar_url,
    CASE 
      WHEN e.date_of_birth IS NOT NULL 
      THEN to_char(e.date_of_birth, 'MM-DD')
      ELSE NULL
    END AS birthday_month_day,
    e.join_date
  FROM employees e
  JOIN profiles p ON p.id = e.user_id
  WHERE e.organization_id = org_id
    AND e.status = 'active';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_birthday_calendar_data(uuid) TO authenticated;