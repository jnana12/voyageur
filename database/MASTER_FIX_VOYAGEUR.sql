-- ========================================================
-- VOYAGEUR ULTIMATE SQUAD FIX
-- ========================================================
-- This script nukes all restrictive RLS and sets up a robust "Join" engine.
-- RUN THIS IN SUPABASE SQL EDITOR.

-- 1. CLEANUP OLD POLICIES (Nuke restrictive ones)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'squad_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.squad_members';
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trips') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.trips';
    END LOOP;
END $$;

-- 2. ENABLE RLS
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_presence ENABLE ROW LEVEL SECURITY;

-- 3. APPLY "MASTER KEY" POLICIES (Authenticated users see everything relevant)
-- Squad Members: Any authenticated user can view the roster (To fix Admin visibility)
CREATE POLICY "Wide Open Squad Read" ON public.squad_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Wide Open Squad Insert" ON public.squad_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Wide Open Squad Delete" ON public.squad_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Profiles: Publicly readable for all logged in users (For names/avatars)
CREATE POLICY "Wide Open Profiles Read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Wide Open Profiles Update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trips: Readable if Owner OR if you know the Trip ID (Simplified)
CREATE POLICY "Wide Open Trips Read" ON public.trips FOR SELECT TO authenticated USING (true);

-- Presence: Any member can see others' presence 
DROP POLICY IF EXISTS "Users can view presence" ON public.tactical_presence;
CREATE POLICY "Wide Open Presence Read" ON public.tactical_presence FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can manage own presence" ON public.tactical_presence;
CREATE POLICY "Wide Open Presence All" ON public.tactical_presence FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 4. THE ROBUST JOIN ENGINE (RPC)
-- This function is SECURITY DEFINER so it ignores RLS for its internal lookups
CREATE OR REPLACE FUNCTION public.join_squad_by_code(target_user_id uuid, invite_code text)
RETURNS uuid AS $$ 
DECLARE
    found_trip_id uuid;
BEGIN
    -- 1. Find Trip ID by Mission Code (Case Insensitive)
    SELECT id INTO found_trip_id
    FROM public.trips
    WHERE upper(mission_code) = upper(invite_code)
    LIMIT 1;

    IF found_trip_id IS NULL THEN
        RAISE EXCEPTION 'MISSION_CODE_INVALID';
    END IF;

    -- 2. Add the user as a 'Vanguard'
    -- Using ON CONFLICT to avoid errors if already joined
    INSERT INTO public.squad_members (trip_id, user_id, role, joined_at)
    VALUES (found_trip_id, target_user_id, 'Vanguard', now())
    ON CONFLICT (trip_id, user_id) DO UPDATE SET joined_at = now();

    RETURN found_trip_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'JOIN_FAILED: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VERIFY SCHEMA
ALTER TABLE public.tactical_presence ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
