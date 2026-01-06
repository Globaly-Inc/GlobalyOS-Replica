-- Add trial extension columns to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_extended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_extended_by UUID,
ADD COLUMN IF NOT EXISTS trial_extension_reason TEXT,
ADD COLUMN IF NOT EXISTS original_trial_ends_at TIMESTAMPTZ;

-- Add dunning columns to subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS dunning_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dunning_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dunning_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dunning_attempt_at TIMESTAMPTZ;

-- Now create the indexes that depend on these columns
CREATE INDEX IF NOT EXISTS idx_subscriptions_dunning ON public.subscriptions(status, dunning_started_at) WHERE status = 'past_due';
CREATE INDEX IF NOT EXISTS idx_subscriptions_trialing ON public.subscriptions(status, trial_ends_at) WHERE status = 'trialing';