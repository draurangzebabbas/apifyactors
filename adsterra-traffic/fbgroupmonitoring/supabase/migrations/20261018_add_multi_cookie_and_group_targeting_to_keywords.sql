-- Add multi-cookie selection, group targeting, and comment delay to user_keywords
ALTER TABLE public.user_keywords
ADD COLUMN IF NOT EXISTS cookie_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS group_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS comment_delay_seconds INTEGER DEFAULT 5;

-- Populate cookie_ids for any existing rows that have cookie_id
UPDATE public.user_keywords
SET cookie_ids = ARRAY[cookie_id]
WHERE cookie_id IS NOT NULL AND (cookie_ids IS NULL OR cardinality(cookie_ids) = 0);
