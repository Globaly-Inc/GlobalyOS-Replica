-- Add new columns to offices table for feature-specific settings
ALTER TABLE offices ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE offices ADD COLUMN IF NOT EXISTS leave_year_start_month INTEGER DEFAULT 1;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS leave_year_start_day INTEGER DEFAULT 1;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS public_holidays_enabled BOOLEAN DEFAULT false;

-- Add work_days array to office_schedules (0=Sun, 1=Mon...6=Sat, default Mon-Fri)
ALTER TABLE office_schedules ADD COLUMN IF NOT EXISTS work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5];

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_offices_timezone ON offices(timezone);
CREATE INDEX IF NOT EXISTS idx_offices_org_id ON offices(organization_id);