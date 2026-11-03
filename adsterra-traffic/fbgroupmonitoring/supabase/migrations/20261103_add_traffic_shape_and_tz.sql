-- Add daily_shape and target_timezone columns to traffic_campaigns
ALTER TABLE public.traffic_campaigns
ADD COLUMN IF NOT EXISTS daily_shape TEXT DEFAULT 'uniform_24h', -- 'uniform_24h', 'business_hours', 'evening_peak', 'global_mix'
ADD COLUMN IF NOT EXISTS target_timezone TEXT DEFAULT 'UTC';
