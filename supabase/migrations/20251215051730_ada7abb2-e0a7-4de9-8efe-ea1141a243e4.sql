-- Add 'owner' to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'owner';