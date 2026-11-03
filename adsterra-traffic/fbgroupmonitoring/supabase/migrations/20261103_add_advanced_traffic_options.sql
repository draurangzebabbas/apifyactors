-- Add advanced scheduling & humanization columns to traffic_campaigns
ALTER TABLE public.traffic_campaigns
ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'one_time', -- 'one_time' | 'recurring'
ADD COLUMN IF NOT EXISTS traffic_curve TEXT DEFAULT 'steady',   -- 'steady' | 'ramp_up' | 'bell_curve'
ADD COLUMN IF NOT EXISTS humanize_jitter BOOLEAN DEFAULT true,  -- adds ±15% natural organic variance
ADD COLUMN IF NOT EXISTS recurring_interval_hours INTEGER DEFAULT 24; -- interval for recurring renews

-- Add jitter tracking column to traffic_batches if desired
ALTER TABLE public.traffic_batches
ADD COLUMN IF NOT EXISTS jitter_applied BOOLEAN DEFAULT false;
