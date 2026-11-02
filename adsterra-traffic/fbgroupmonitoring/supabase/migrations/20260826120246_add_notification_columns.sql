-- Migration: Add Notification Columns to public.users
-- Applied: 2026-08-26

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_subscription JSONB,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
