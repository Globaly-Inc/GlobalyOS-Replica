-- Add start_time and end_time columns to calendar_events table
ALTER TABLE public.calendar_events 
ADD COLUMN start_time time without time zone DEFAULT NULL,
ADD COLUMN end_time time without time zone DEFAULT NULL;