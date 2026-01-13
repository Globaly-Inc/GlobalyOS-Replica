-- Fix GlobalyHub's plan to match its subscription (pro -> enterprise)
UPDATE organizations 
SET plan = 'enterprise' 
WHERE id = '11111111-1111-1111-1111-111111111111' AND plan = 'pro';