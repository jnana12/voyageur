-- HARDENED NUCLEAR PRESENCE FIX
-- Purpose: Forcefully reset the tactical_presence table to resolve persistent 409 Conflicts.

BEGIN;

-- 1. Drop the table entirely to kill any hidden indexes/constraints/policies
DROP TABLE IF EXISTS public.tactical_presence CASCADE;

-- 2. Recreate with the strict User-centric structure
CREATE TABLE public.tactical_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    battery_level INTEGER,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT TRUE
);

-- 3. Optimization Indexes
CREATE INDEX idx_presence_trip_id ON public.tactical_presence(trip_id);

-- 4. Secure & Enable Realtime
ALTER TABLE public.tactical_presence ENABLE ROW LEVEL SECURITY;

-- OWNER: Full control of their own status row
CREATE POLICY "presence_owner_all" ON public.tactical_presence
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- SQUAD: View presence for trips you can access
CREATE POLICY "presence_squad_read" ON public.tactical_presence
FOR SELECT TO authenticated
USING (public.can_access_trip(trip_id, auth.uid()));

-- Re-enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tactical_presence;

COMMIT;

-- VERIFICATION QUERY (Run this after applying to confirm it's clean):
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.tactical_presence'::regclass;
-- Expected output: one 'p' (primary key) constraint.
