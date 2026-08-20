-- ========================================================
-- MASTER RLS FIX v3: COMPLETE REPAIR
-- Run this to fix "500 Internal Server Error" and "Invisible Squad"
-- ========================================================

-- 0. HELPER FUNCTION (The Anti-Recursion Key)
-- We drop it with CASCADE to remove any old policies linked to it
DROP FUNCTION IF EXISTS public.check_is_squad_member_safe(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.check_is_squad_member_safe(search_trip_id uuid)
RETURNS boolean AS $$
BEGIN
    -- SECURITY DEFINER = Runs as admin, bypassing RLS to avoid infinite loops
    RETURN EXISTS (
        SELECT 1 FROM public.squad_members 
        WHERE trip_id = search_trip_id 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. SQUAD MEMBERS (Fix Recursion)
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view squad membership" ON public.squad_members;

CREATE POLICY "Users can view squad membership" ON public.squad_members
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR 
    public.check_is_squad_member_safe(trip_id) -- Use Safe Function
    OR
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid()) -- Owner
);


-- 2. PROFILES (Fix Visibility)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Squad members can view co-member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by any authenticated user" ON public.profiles;

CREATE POLICY "Profiles are viewable by any authenticated user" ON public.profiles
FOR SELECT TO authenticated USING (true); -- Simple & Safe

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- 3. TRIPS (Ensure you can see the trip itself)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Squad members can view trips" ON public.trips;

CREATE POLICY "Users can view own trips" ON public.trips
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() -- Owner
    OR
    public.check_is_squad_member_safe(id) -- Squad Member (Safe)
);

DROP POLICY IF EXISTS "Users can insert own trips" ON public.trips;
CREATE POLICY "Users can insert own trips" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trips" ON public.trips;
CREATE POLICY "Users can update own trips" ON public.trips FOR UPDATE TO authenticated USING (auth.uid() = user_id);


-- 4. PRESENCE (See who is online)
ALTER TABLE public.tactical_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Users can view presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON public.tactical_presence;

CREATE POLICY "Users can manage own presence" ON public.tactical_presence FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view presence" ON public.tactical_presence FOR SELECT TO authenticated USING (true);


