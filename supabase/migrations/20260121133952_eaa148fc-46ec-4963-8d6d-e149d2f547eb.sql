-- Function to auto-generate QR code when an office is created
CREATE OR REPLACE FUNCTION public.auto_generate_office_qr_code()
RETURNS TRIGGER AS $$
DECLARE
  v_qr_code TEXT;
BEGIN
  -- Generate unique code: office_id-timestamp-random
  v_qr_code := NEW.id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
               substr(md5(random()::text), 1, 12);
  
  -- Insert new QR code for this office
  INSERT INTO public.office_qr_codes (
    office_id,
    organization_id,
    code,
    is_active,
    latitude,
    longitude,
    radius_meters
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    v_qr_code,
    true,
    NULL,
    NULL,
    100
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: After office insert, auto-generate QR code
DROP TRIGGER IF EXISTS trigger_auto_generate_office_qr ON public.offices;
CREATE TRIGGER trigger_auto_generate_office_qr
AFTER INSERT ON public.offices
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_office_qr_code();