-- Schedule daily cleanup of notifications older than 15 days
-- Runs at 3:00 AM UTC daily to minimize impact on active users

SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '15 days';
  $$
);