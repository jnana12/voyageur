-- ==========================================
-- COLLABORATIVE CONFIRMATION FIX
-- ==========================================
-- Allow squad members to update trip details (like status) 
-- while maintaining ownership for other operations.

BEGIN;

-- 1. TRIPS: Grant squad members UPDATE permission
-- Note: Owners already have FOR ALL access via trips_owner_all
DROP POLICY IF EXISTS "trips_squad_update" ON public.trips;
CREATE POLICY "trips_squad_update" ON public.trips
FOR UPDATE TO authenticated
USING (public.can_access_trip(id, auth.uid()))
WITH CHECK (public.can_access_trip(id, auth.uid()));

-- 2. TRIPS: Explicit SELECT for squad members (redundancy check)
DROP POLICY IF EXISTS "trips_squad_read" ON public.trips;
CREATE POLICY "trips_squad_read" ON public.trips
FOR SELECT TO authenticated
USING (public.can_access_trip(id, auth.uid()));

COMMIT;
