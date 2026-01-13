-- Update the notify_critical_error function to be non-blocking
-- This ensures that even if notification fails, error logs are still recorded
CREATE OR REPLACE FUNCTION public.notify_critical_error()
RETURNS TRIGGER AS $$
BEGIN
  -- Only attempt notification for critical/error severity
  IF NEW.severity IN ('critical', 'error') THEN
    BEGIN
      -- Wrap in exception handler so HTTP failures don't block insert
      PERFORM extensions.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-critical-error',
        body := json_build_object(
          'error_id', NEW.id,
          'error_type', NEW.error_type,
          'severity', NEW.severity,
          'error_message', NEW.error_message,
          'page_url', NEW.page_url,
          'component_name', NEW.component_name,
          'user_id', NEW.user_id,
          'organization_id', NEW.organization_id,
          'created_at', NEW.created_at
        )::text,
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )::jsonb
      );
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore notification failures - logging is more important than notifications
      RAISE NOTICE 'notify_critical_error: notification failed but insert continues: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;