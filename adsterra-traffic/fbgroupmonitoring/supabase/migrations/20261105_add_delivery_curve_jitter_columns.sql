-- Migration: Add delivery_mode, traffic_curve, humanize_jitter, recurring_interval_hours
-- to traffic_campaigns and jitter_applied to traffic_batches
-- These were missing from the live DB (applied 2026-11-05 via MCP)

ALTER TABLE traffic_campaigns
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS traffic_curve TEXT DEFAULT 'steady',
  ADD COLUMN IF NOT EXISTS humanize_jitter BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurring_interval_hours INTEGER DEFAULT 24;

ALTER TABLE traffic_batches
  ADD COLUMN IF NOT EXISTS jitter_applied BOOLEAN DEFAULT false;

-- Reload PostgREST schema cache so new columns are immediately visible via API
NOTIFY pgrst, 'reload schema';
