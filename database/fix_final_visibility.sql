-- ========================================================
-- FINAL VIOYAGEUR VISIBILITY FIX (SQUAD & COMMS)
-- ========================================================
-- Run this in Supabase SQL Editor to fix "Invisible Members" and "Comms" bugs.

-- 1. RESET POLICIES (Drop potential conflicts)
DROP POLICY IF EXISTS "Users can view squad membership" ON public.squad_members;
DROP POLICY IF EXISTS "Wide Open Squad Read" ON public.squad_members;
DROP POLICY IF EXISTS "Wide Open Squad Insert" ON public.squad_members;
DROP POLICY IF EXISTS "Wide Open Squad Delete" ON public.squad_members;

DROP POLICY IF EXISTS "Users can view presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Wide Open Presence Read" ON public.tactical_presence;
DROP POLICY IF EXISTS "Wide Open Presence All" ON public.tactical_presence;

DROP POLICY IF EXISTS "squad_comms_policy" ON public.mission_comms;
DROP POLICY IF EXISTS "Wide Open Comms Read" ON public.mission_comms;
DROP POLICY IF EXISTS "Wide Open Comms Write" ON public.mission_comms;

DROP POLICY IF EXISTS "Profiles are viewable by any authenticated user" ON public.profiles;

-- 2. ENABLE ROW LEVEL SECURITY (Safety Check)
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_comms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. APPLY "VISIBLE TO ALL AUTHENTICATED" POLICIES
-- This ensures that if you are logged in, you can see other squad members.

-- SQUAD MEMBERS
CREATE POLICY "Wide Open Squad Read" ON public.squad_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Wide Open Squad Insert" ON public.squad_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Allow modification only if you own the row (leave squad)
CREATE POLICY "Wide Open Squad Delete" ON public.squad_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PRESENCE (Locations)
CREATE POLICY "Wide Open Presence Read" ON public.tactical_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "Wide Open Presence Write" ON public.tactical_presence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Wide Open Presence Update" ON public.tactical_presence FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- COMMS (Chat)
CREATE POLICY "Wide Open Comms Read" ON public.mission_comms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Wide Open Comms Write" ON public.mission_comms FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- PROFILES (Avatars & Names)
DROP POLICY IF EXISTS "Wide Open Profiles Read" ON public.profiles;
DROP POLICY IF EXISTS "Wide Open Profiles Update" ON public.profiles;

CREATE POLICY "Wide Open Profiles Read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Wide Open Profiles Update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. FIX "HOST" PERMISSION (Auto-add Owner to Squad)
-- If usage of RPC fails, this trigger ensures completeness
CREATE OR REPLACE FUNCTION public.auto_add_owner_to_squad()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.squad_members (trip_id, user_id, role, joined_at)
    VALUES (new.id, new.user_id, 'Captain', now())
    ON CONFLICT (trip_id, user_id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_trip_created_add_owner ON public.trips;
CREATE TRIGGER on_trip_created_add_owner
    AFTER INSERT ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.auto_add_owner_to_squad();

-- 5. ROBUST JOIN FUNCTION (RPC)
-- Redefine to ensure it works correctly
CREATE OR REPLACE FUNCTION public.join_squad_by_code(target_user_id uuid, invite_code text)
RETURNS uuid AS $$ 
DECLARE
    found_trip_id uuid;
BEGIN
    -- 1. Find Trip
    SELECT id INTO found_trip_id
    FROM public.trips
    WHERE upper(mission_code) = upper(invite_code)
    LIMIT 1;

    IF found_trip_id IS NULL THEN
        RAISE EXCEPTION 'MISSION_CODE_INVALID';
    END IF;

    -- 2. Add as Vanguard
    INSERT INTO public.squad_members (trip_id, user_id, role, joined_at)
    VALUES (found_trip_id, target_user_id, 'Vanguard', now())
    ON CONFLICT (trip_id, user_id) DO UPDATE SET joined_at = now();

    RETURN found_trip_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'JOIN_FAILED: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. VERIFY COLUMNS
ALTER TABLE public.tactical_presence ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
