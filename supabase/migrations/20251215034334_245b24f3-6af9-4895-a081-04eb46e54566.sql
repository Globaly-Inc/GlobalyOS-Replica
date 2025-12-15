-- 1. Add unique constraint on usage_records for upsert operations
ALTER TABLE usage_records 
ADD CONSTRAINT usage_records_org_feature_period_unique 
UNIQUE (organization_id, feature, billing_period);

-- 2. Function to check feature limits
CREATE OR REPLACE FUNCTION check_feature_limit(
  _organization_id UUID,
  _feature TEXT,
  _increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan TEXT;
  _monthly_limit INTEGER;
  _current_usage INTEGER;
  _billing_period TEXT;
  _allowed BOOLEAN;
BEGIN
  -- Get organization's current plan
  SELECT plan INTO _plan
  FROM subscriptions
  WHERE organization_id = _organization_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _plan IS NULL THEN
    -- No active subscription, allow with warning (trial fallback)
    RETURN jsonb_build_object('allowed', true, 'warning', 'No active subscription found');
  END IF;

  -- Get limit for this plan/feature
  SELECT monthly_limit INTO _monthly_limit
  FROM plan_limits
  WHERE plan = _plan AND feature = _feature AND is_active = true;

  -- NULL or -1 means unlimited
  IF _monthly_limit IS NULL OR _monthly_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true);
  END IF;

  -- Get current billing period (YYYY-MM format)
  _billing_period := to_char(CURRENT_DATE, 'YYYY-MM');

  -- Get current usage
  SELECT COALESCE(quantity, 0) INTO _current_usage
  FROM usage_records
  WHERE organization_id = _organization_id
    AND feature = _feature
    AND billing_period = _billing_period;

  _current_usage := COALESCE(_current_usage, 0);
  _allowed := (_current_usage + _increment) <= _monthly_limit;

  RETURN jsonb_build_object(
    'allowed', _allowed,
    'current_usage', _current_usage,
    'limit', _monthly_limit,
    'remaining', GREATEST(0, _monthly_limit - _current_usage),
    'would_exceed_by', GREATEST(0, (_current_usage + _increment) - _monthly_limit)
  );
END;
$$;

-- 3. Function to record usage
CREATE OR REPLACE FUNCTION record_usage(
  _organization_id UUID,
  _feature TEXT,
  _quantity INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _billing_period TEXT;
BEGIN
  _billing_period := to_char(CURRENT_DATE, 'YYYY-MM');

  INSERT INTO usage_records (organization_id, feature, billing_period, quantity)
  VALUES (_organization_id, _feature, _billing_period, _quantity)
  ON CONFLICT (organization_id, feature, billing_period)
  DO UPDATE SET 
    quantity = usage_records.quantity + EXCLUDED.quantity,
    updated_at = NOW();
END;
$$;

-- 4. Function to get current usage for an organization
CREATE OR REPLACE FUNCTION get_organization_usage(
  _organization_id UUID,
  _billing_period TEXT DEFAULT NULL
)
RETURNS TABLE(feature TEXT, quantity INTEGER, monthly_limit INTEGER, overage_rate NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan TEXT;
  _period TEXT;
BEGIN
  -- Use current period if not specified
  _period := COALESCE(_billing_period, to_char(CURRENT_DATE, 'YYYY-MM'));
  
  -- Get organization's current plan
  SELECT s.plan INTO _plan
  FROM subscriptions s
  WHERE s.organization_id = _organization_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN QUERY
  SELECT 
    pl.feature,
    COALESCE(ur.quantity, 0)::INTEGER as quantity,
    pl.monthly_limit,
    pl.overage_rate
  FROM plan_limits pl
  LEFT JOIN usage_records ur ON ur.feature = pl.feature 
    AND ur.organization_id = _organization_id 
    AND ur.billing_period = _period
  WHERE pl.plan = _plan AND pl.is_active = true;
END;
$$;

-- 5. Trigger function for leave request usage tracking
CREATE OR REPLACE FUNCTION track_leave_request_usage()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM record_usage(NEW.organization_id, 'leave_requests', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for leave requests
DROP TRIGGER IF EXISTS on_leave_request_created ON leave_requests;
CREATE TRIGGER on_leave_request_created
AFTER INSERT ON leave_requests
FOR EACH ROW EXECUTE FUNCTION track_leave_request_usage();

-- 6. Trigger function for attendance usage tracking
CREATE OR REPLACE FUNCTION track_attendance_usage()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM record_usage(NEW.organization_id, 'attendance_scans', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for attendance records
DROP TRIGGER IF EXISTS on_attendance_created ON attendance_records;
CREATE TRIGGER on_attendance_created
AFTER INSERT ON attendance_records
FOR EACH ROW EXECUTE FUNCTION track_attendance_usage();