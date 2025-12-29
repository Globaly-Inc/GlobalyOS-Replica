-- Add unique constraint on leave_balance_logs for (leave_request_id, action)
-- This is required by the handle_leave_request_balance trigger which uses:
-- ON CONFLICT (leave_request_id, action) DO NOTHING

ALTER TABLE public.leave_balance_logs
  ADD CONSTRAINT leave_balance_logs_leave_request_id_action_key
  UNIQUE (leave_request_id, action);