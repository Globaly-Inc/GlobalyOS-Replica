
-- Add Google Calendar OAuth token columns to scheduler_integration_settings
ALTER TABLE public.scheduler_integration_settings
  ADD COLUMN IF NOT EXISTS google_access_token text,
  ADD COLUMN IF NOT EXISTS google_refresh_token text,
  ADD COLUMN IF NOT EXISTS google_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_calendar_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_email text;
