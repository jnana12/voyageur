-- ==========================================
-- VOYAGEUR MASTER SECURITY & SCHEMA FIX
-- ==========================================
-- This script:
-- 1. Fixes Trips RLS (Owners vs Squad)
-- 2. Fixes Squad Members RLS (Join/Leave/View)
-- 3. Fixes Presence 409 Conflicts (Nuclear Schema Reset)
-- 4. Ensures authoritative ownership for all tables.

BEGIN;

-- ----------------------------------------------------------------
-- 1. TRIPS: SECURE ACCESS
-- ----------------------------------------------------------------
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trips') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trips', pol.policyname);
    END LOOP;
END $$;

-- Owners have full control of their own trips.
CREATE POLICY "trips_owner_all" ON public.trips
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Squad members can view trips they are part of.
CREATE POLICY "trips_squad_read" ON public.trips
FOR SELECT TO authenticated
USING (public.can_access_trip(id, auth.uid()));

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- 2. SQUAD MEMBERS: JOIN/LEAVE/VIEW
-- ----------------------------------------------------------------
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'squad_members') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.squad_members', pol.policyname);
    END LOOP;
END $$;

-- Everyone can see members (for sidebar visibility)
CREATE POLICY "squad_members_read" ON public.squad_members
FOR SELECT TO authenticated
USING (true);

-- Users can manage their own squad membership (Join/Leave)
CREATE POLICY "squad_members_manage_self" ON public.squad_members
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- 3. TACTICAL PRESENCE: NUCLEAR SCHEMA FIX (RESOLVE 409 CONFLICT)
-- ----------------------------------------------------------------
-- Wipe and rebuild to ensure user_id is the ONLY Primary Key
DROP TABLE IF EXISTS public.tactical_presence CASCADE;

CREATE TABLE public.tactical_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    battery_level INTEGER,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_presence_trip_id ON public.tactical_presence(trip_id);

-- Apply Presence RLS
ALTER TABLE public.tactical_presence ENABLE ROW LEVEL SECURITY;

-- Owner: Full control
CREATE POLICY "presence_owner_all" ON public.tactical_presence
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Squad: View access
CREATE POLICY "presence_squad_read" ON public.tactical_presence
FOR SELECT TO authenticated
USING (public.can_access_trip(trip_id, auth.uid()));

-- Re-enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tactical_presence;


-- ----------------------------------------------------------------
-- 4. MISSION COMMS: SECURE CHAT
-- ----------------------------------------------------------------
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mission_comms') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.mission_comms', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "comms_squad_access" ON public.mission_comms
FOR ALL TO authenticated
USING (public.can_access_trip(trip_id, auth.uid()))
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.mission_comms ENABLE ROW LEVEL SECURITY;

COMMIT;
