-- ========================================================
-- USER SETTINGS MIGRATION
-- Stores user preferences (dietary, luxury tier) in Supabase
-- ========================================================

-- 1. Create User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dietary text DEFAULT 'None',
  luxury int DEFAULT 3,
  dark_mode boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on User Settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own settings
DROP POLICY IF EXISTS "Users view own settings" ON public.user_settings;
CREATE POLICY "Users view own settings" ON public.user_settings
FOR SELECT USING ((select auth.uid()) = user_id);

-- Policy: Users can insert their own settings
DROP POLICY IF EXISTS "Users insert own settings" ON public.user_settings;
CREATE POLICY "Users insert own settings" ON public.user_settings
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Users can update their own settings
DROP POLICY IF EXISTS "Users update own settings" ON public.user_settings;
CREATE POLICY "Users update own settings" ON public.user_settings
FOR UPDATE 
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- 2. Function to Upsert User Settings (Atomic)
CREATE OR REPLACE FUNCTION upsert_user_settings(
  p_user_id uuid,
  p_dietary text DEFAULT NULL,
  p_luxury int DEFAULT NULL,
  p_dark_mode boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security Guard
  IF (select auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'Not allowed to modify settings for another user';
  END IF;

  -- Upsert settings
  INSERT INTO public.user_settings (user_id, dietary, luxury, dark_mode, updated_at)
  VALUES (
    p_user_id,
    COALESCE(p_dietary, 'None'),
    COALESCE(p_luxury, 3),
    COALESCE(p_dark_mode, true),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    dietary = COALESCE(EXCLUDED.dietary, user_settings.dietary),
    luxury = COALESCE(EXCLUDED.luxury, user_settings.luxury),
    dark_mode = COALESCE(EXCLUDED.dark_mode, user_settings.dark_mode),
    updated_at = now();
END;
$$;

-- 3. Function to Get User Settings
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id uuid)
RETURNS TABLE (dietary text, luxury int, dark_mode boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security Guard
  IF (select auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'Not allowed to view settings for another user';
  END IF;

  RETURN QUERY
  SELECT us.dietary, us.luxury, us.dark_mode
  FROM public.user_settings us
  WHERE us.user_id = p_user_id;
END;
$$;
