-- Migration: Remove free plan from subscriptions and update handle_new_user trigger to link guest subscriptions
-- Applied: 2026-08-26

-- 1. Delete all default free subscriptions
DELETE FROM public.subscriptions WHERE plan_id = 'free';

-- 2. Update handle_new_user to link guest subscriptions
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

  -- Link any existing guest-checkout subscriptions with same email
  UPDATE public.subscriptions
  SET user_id = new.id
  WHERE email = new.email AND user_id IS NULL;

  RETURN new;
END;
$$;
