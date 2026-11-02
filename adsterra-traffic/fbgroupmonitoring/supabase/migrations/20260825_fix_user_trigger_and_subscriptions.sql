-- Migration: Fix handle_new_user trigger + add email to subscriptions
-- Applied: 2026-08-25

-- 1. Add email column to subscriptions (if not already present)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS email text;

-- 2. Fix handle_new_user: properly map email and create free-plan subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert into public.users with email properly mapped from auth.users
  INSERT INTO public.users (id, email, created_at)
  VALUES (new.id, new.email, new.created_at)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Create a free-plan subscription row for every new signup
  INSERT INTO public.subscriptions (id, user_id, email, status, plan_id, created_at)
  VALUES (
    'free_' || new.id::text,
    new.id,
    new.email,
    'active',
    'free',
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- 3. Backfill emails for any existing users missing them
UPDATE public.users pu
SET email = au.email
FROM auth.users au
WHERE pu.id = au.id AND pu.email IS NULL;

-- 4. Backfill free subscriptions for existing users who don't have any
INSERT INTO public.subscriptions (id, user_id, email, status, plan_id, created_at)
SELECT
  'free_' || pu.id::text,
  pu.id,
  pu.email,
  'active',
  'free',
  now()
FROM public.users pu
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = pu.id
)
ON CONFLICT (id) DO NOTHING;
