-- Sync personal_info from onboarding data to employees table for affected records
UPDATE employees e
SET 
  personal_email = COALESCE(e.personal_email, (eod.personal_info->>'personal_email')),
  phone = COALESCE(e.phone, (eod.personal_info->>'phone')),
  date_of_birth = COALESCE(e.date_of_birth, (eod.personal_info->>'date_of_birth')::date),
  gender = COALESCE(e.gender, (eod.personal_info->>'gender')),
  street = COALESCE(e.street, (eod.personal_info->'address'->>'street')),
  city = COALESCE(e.city, (eod.personal_info->'address'->>'city')),
  state = COALESCE(e.state, (eod.personal_info->'address'->>'state')),
  postcode = COALESCE(e.postcode, (eod.personal_info->'address'->>'postcode')),
  country = COALESCE(e.country, (eod.personal_info->'address'->>'country')),
  emergency_contact_name = COALESCE(e.emergency_contact_name, (eod.personal_info->'emergency_contact'->>'name')),
  emergency_contact_phone = COALESCE(e.emergency_contact_phone, (eod.personal_info->'emergency_contact'->>'phone')),
  emergency_contact_relationship = COALESCE(e.emergency_contact_relationship, (eod.personal_info->'emergency_contact'->>'relationship')),
  linkedin_url = COALESCE(e.linkedin_url, (eod.personal_info->>'linkedin_url'))
FROM employee_onboarding_data eod
WHERE e.id = eod.employee_id
  AND eod.personal_info IS NOT NULL
  AND eod.personal_info != '{}'::jsonb;

-- Create trigger function to sync personal_info to employees on onboarding completion
CREATE OR REPLACE FUNCTION sync_onboarding_personal_info()
RETURNS TRIGGER AS $$
BEGIN
  -- When onboarding is completed, sync personal_info to employees table
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR NEW.personal_info IS DISTINCT FROM OLD.personal_info) THEN
    UPDATE employees
    SET 
      personal_email = COALESCE(employees.personal_email, (NEW.personal_info->>'personal_email')),
      phone = COALESCE(employees.phone, (NEW.personal_info->>'phone')),
      date_of_birth = COALESCE(employees.date_of_birth, (NEW.personal_info->>'date_of_birth')::date),
      gender = COALESCE(employees.gender, (NEW.personal_info->>'gender')),
      street = COALESCE(employees.street, (NEW.personal_info->'address'->>'street')),
      city = COALESCE(employees.city, (NEW.personal_info->'address'->>'city')),
      state = COALESCE(employees.state, (NEW.personal_info->'address'->>'state')),
      postcode = COALESCE(employees.postcode, (NEW.personal_info->'address'->>'postcode')),
      country = COALESCE(employees.country, (NEW.personal_info->'address'->>'country')),
      emergency_contact_name = COALESCE(employees.emergency_contact_name, (NEW.personal_info->'emergency_contact'->>'name')),
      emergency_contact_phone = COALESCE(employees.emergency_contact_phone, (NEW.personal_info->'emergency_contact'->>'phone')),
      emergency_contact_relationship = COALESCE(employees.emergency_contact_relationship, (NEW.personal_info->'emergency_contact'->>'relationship')),
      linkedin_url = COALESCE(employees.linkedin_url, (NEW.personal_info->>'linkedin_url'))
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS sync_onboarding_data_on_complete ON employee_onboarding_data;

CREATE TRIGGER sync_onboarding_data_on_complete
AFTER UPDATE ON employee_onboarding_data
FOR EACH ROW
EXECUTE FUNCTION sync_onboarding_personal_info();