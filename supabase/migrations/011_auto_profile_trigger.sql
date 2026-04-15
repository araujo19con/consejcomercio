-- ============================================================
-- Migration 011: Auto-create profile on user signup
-- ============================================================
-- Problem: new users in auth.users had no corresponding row in
-- perfis, so they saw blank/stale profile data from other users.
--
-- Fix:
--  1. A SECURITY DEFINER function that creates a minimal perfis
--     row whenever a new user is inserted in auth.users.
--  2. A trigger that fires the function after each signup.
--  3. A backfill that creates rows for any existing auth users
--     who don't have a perfis row yet.
-- ============================================================

-- 1. Function ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_name TEXT;
BEGIN
  -- Prefer a full name from OAuth/invite metadata; fall back to
  -- the part of the e-mail before the "@", replacing dots/dashes
  -- with spaces so "joao.silva" becomes "joao silva".
  default_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
    REPLACE(REPLACE(REPLACE(SPLIT_PART(new.email, '@', 1), '.', ' '), '_', ' '), '-', ' ')
  );

  INSERT INTO public.perfis (id, email, nome)
  VALUES (new.id, new.email, default_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- 2. Trigger ───────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 3. Backfill: existing auth users without a perfis row ────────
INSERT INTO public.perfis (id, email, nome)
SELECT
  u.id,
  u.email,
  REPLACE(REPLACE(REPLACE(SPLIT_PART(u.email, '@', 1), '.', ' '), '_', ' '), '-', ' ')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.perfis p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
