-- Add indexes for commonly queried columns to improve performance

-- Index for profiles lookup by id (used in validateUserExists)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Index for organization member lookups by user_id and organization_id
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org 
ON organization_members(user_id, organization_id);

-- Index for employee lookups by user_id and organization_id
CREATE INDEX IF NOT EXISTS idx_employees_user_org 
ON employees(user_id, organization_id);