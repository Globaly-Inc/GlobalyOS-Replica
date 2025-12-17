-- Drop legacy overload that doesn't accept location/office params
DROP FUNCTION IF EXISTS public.validate_qr_and_record_attendance(text, text);