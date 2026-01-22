-- Allow created_by to be NULL for system-generated QR codes (via trigger)
ALTER TABLE public.office_qr_codes 
ALTER COLUMN created_by DROP NOT NULL;

-- Add a comment to clarify when created_by is NULL
COMMENT ON COLUMN public.office_qr_codes.created_by IS 
  'User who created the QR code. NULL for auto-generated QR codes from office creation trigger.';