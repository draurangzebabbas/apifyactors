-- Update groups_status_check constraint to include 'PAUSED' status
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_status_check;
ALTER TABLE public.groups ADD CONSTRAINT groups_status_check CHECK (status IN ('SUBMITTED', 'ACTIVE', 'PAUSED', 'REJECTED', 'NEEDS_COOKIE'));
