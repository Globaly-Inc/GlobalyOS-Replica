-- Fix inconsistent casing in leave_requests.leave_type column
-- Normalize all variations of "menstrual leave" to "Menstrual Leave"
UPDATE leave_requests 
SET leave_type = 'Menstrual Leave' 
WHERE leave_type ILIKE '%menstrual%' AND leave_type != 'Menstrual Leave';