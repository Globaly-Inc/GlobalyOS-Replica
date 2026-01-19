-- 1. Add the missing departments_roles column to org_onboarding_data
ALTER TABLE public.org_onboarding_data 
ADD COLUMN IF NOT EXISTS departments_roles jsonb DEFAULT '{}'::jsonb;

-- 2. Drop the incorrect global unique constraint on positions
ALTER TABLE public.positions DROP CONSTRAINT IF EXISTS positions_name_key;

-- 3. Add proper multi-tenant unique constraint (organization_id + name)
ALTER TABLE public.positions 
ADD CONSTRAINT positions_organization_name_unique 
UNIQUE (organization_id, name);

-- 4. Ensure organization_id is always required for proper tenant isolation
ALTER TABLE public.positions 
ALTER COLUMN organization_id SET NOT NULL;