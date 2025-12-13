-- Add is_recurring column to calendar_events table for annual recurrence
ALTER TABLE public.calendar_events 
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false;