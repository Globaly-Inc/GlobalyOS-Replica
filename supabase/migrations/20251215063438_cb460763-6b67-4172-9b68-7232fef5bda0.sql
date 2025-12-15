-- Fix the record_usage function to properly handle date type for billing_period
CREATE OR REPLACE FUNCTION public.record_usage(_organization_id uuid, _feature text, _quantity integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _billing_period DATE;
BEGIN
  -- Use first day of the current month as the billing period date
  _billing_period := date_trunc('month', CURRENT_DATE)::DATE;

  INSERT INTO usage_records (organization_id, feature, billing_period, quantity)
  VALUES (_organization_id, _feature, _billing_period, _quantity)
  ON CONFLICT (organization_id, feature, billing_period)
  DO UPDATE SET 
    quantity = usage_records.quantity + EXCLUDED.quantity,
    recorded_at = NOW();
END;
$function$;

-- Also fix check_feature_limit function to use proper date type
CREATE OR REPLACE FUNCTION public.check_feature_limit(_organization_id uuid, _feature text, _increment integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan TEXT;
  _monthly_limit INTEGER;
  _current_usage INTEGER;
  _billing_period DATE;
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

  -- Get current billing period (first day of current month)
  _billing_period := date_trunc('month', CURRENT_DATE)::DATE;

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
$function$;

-- Also fix get_organization_usage function
CREATE OR REPLACE FUNCTION public.get_organization_usage(_organization_id uuid, _billing_period date DEFAULT NULL)
 RETURNS TABLE(feature text, quantity integer, monthly_limit integer, overage_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan TEXT;
  _period DATE;
BEGIN
  -- Use current month's first day if not specified
  _period := COALESCE(_billing_period, date_trunc('month', CURRENT_DATE)::DATE);
  
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
$function$;