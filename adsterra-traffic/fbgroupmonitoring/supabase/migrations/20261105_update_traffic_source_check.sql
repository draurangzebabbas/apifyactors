-- Migration: Update traffic_campaigns_traffic_source_check to include frontend traffic sources
-- Allows 'referrer', 'serp_google', 'direct', 'backlink', 'social', 'simulated_referral'

ALTER TABLE traffic_campaigns 
  DROP CONSTRAINT IF EXISTS traffic_campaigns_traffic_source_check;

ALTER TABLE traffic_campaigns 
  ADD CONSTRAINT traffic_campaigns_traffic_source_check 
  CHECK (traffic_source = ANY (ARRAY[
    'serp_google'::text, 
    'simulated_referral'::text, 
    'referrer'::text, 
    'direct'::text, 
    'backlink'::text, 
    'social'::text
  ]));

NOTIFY pgrst, 'reload schema';

