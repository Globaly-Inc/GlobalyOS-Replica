
-- Auto-generate quotation_number on insert via trigger
CREATE OR REPLACE FUNCTION public.auto_generate_quotation_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_next INTEGER;
BEGIN
  -- Ensure settings row exists
  INSERT INTO crm_quotation_settings (organization_id)
  VALUES (NEW.organization_id)
  ON CONFLICT (organization_id) DO NOTHING;

  -- Get and increment
  UPDATE crm_quotation_settings
  SET next_quotation_number = next_quotation_number + 1,
      updated_at = now()
  WHERE organization_id = NEW.organization_id
  RETURNING quotation_prefix, next_quotation_number - 1 INTO v_prefix, v_next;

  NEW.quotation_number := v_prefix || LPAD(v_next::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_quotation_number
  BEFORE INSERT ON public.crm_quotations
  FOR EACH ROW
  WHEN (NEW.quotation_number IS NULL OR NEW.quotation_number = '')
  EXECUTE FUNCTION public.auto_generate_quotation_number();
