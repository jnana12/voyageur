-- ==========================================
-- NUCLEAR RLS & CONFLICT FIX (Consolidated)
-- ==========================================
-- Run this in Supabase SQL Editor to resolve persistent 403 and 409 errors.

BEGIN;

-- 1. TACTICAL PRESENCE: Fix Primary Key & Unique Constraints
-- Ensure user_id is the EXCLUSIVE Unique Primary Key
ALTER TABLE public.tactical_presence DROP CONSTRAINT IF EXISTS tactical_presence_pkey CASCADE;
ALTER TABLE public.tactical_presence DROP CONSTRAINT IF EXISTS tactical_presence_trip_id_key CASCADE;
ALTER TABLE public.tactical_presence ADD PRIMARY KEY (user_id);

-- 2. RESET POLICIES (Trips, Prescence, Prompts)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can update trips" ON public.trips;
DROP POLICY IF EXISTS "Users can create trips" ON public.trips;
DROP POLICY IF EXISTS "Owner/Squad can view trip" ON public.trips;
DROP POLICY IF EXISTS "trips_owner_all" ON public.trips;

DROP POLICY IF EXISTS "Users can manage own presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Wide Open Presence Read" ON public.tactical_presence;
DROP POLICY IF EXISTS "Wide Open Presence All" ON public.tactical_presence;
DROP POLICY IF EXISTS "Wide Open Presence Write" ON public.tactical_presence;
DROP POLICY IF EXISTS "Wide Open Presence Update" ON public.tactical_presence;

DROP POLICY IF EXISTS "prompts_owner_all" ON public.prompts;

-- 3. APPLY COMPREHENSIVE "FOR ALL" POLICIES
-- This ensures INSERT, UPDATE, DELETE, and SELECT all work if the user_id matches.
-- FOR ALL is more robust for UPSERT operations in PostgREST.

-- TRIPS: Full control for owners
CREATE POLICY "trips_owner_all" ON public.trips
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- TRIPS: Read access for squad members
CREATE POLICY "trips_squad_read" ON public.trips
FOR SELECT TO authenticated
USING (public.can_access_trip(id, auth.uid()));

-- PRESENCE: Full control for owners
CREATE POLICY "presence_owner_all" ON public.tactical_presence
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PRESENCE: Read access for everyone (for squad visibility)
CREATE POLICY "presence_wide_read" ON public.tactical_presence
FOR SELECT TO authenticated
USING (true);

-- PROMPTS: Full control for owners
CREATE POLICY "prompts_owner_all" ON public.prompts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMIT;
