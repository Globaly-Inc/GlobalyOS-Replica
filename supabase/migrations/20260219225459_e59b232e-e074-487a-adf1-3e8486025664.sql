-- Add auto_reply config columns to inbox_channels
ALTER TABLE public.inbox_channels
  ADD COLUMN IF NOT EXISTS ai_auto_reply_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence_threshold numeric(3,2) NOT NULL DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS ai_safe_intents text[] NOT NULL DEFAULT ARRAY['faq', 'hours', 'pricing', 'booking']::text[],
  ADD COLUMN IF NOT EXISTS ai_blocked_intents text[] NOT NULL DEFAULT ARRAY['billing_dispute', 'legal', 'refund']::text[];
