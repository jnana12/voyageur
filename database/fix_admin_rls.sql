-- ========================================================
-- ADMIN VISIBILITY FIX
-- ========================================================
-- Run this script to ensure TRIP OWNERS can see all SQUAD MEMBERS.

-- 1. Reset Squad Members RLS to be fully permissive for authenticated users
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Nuke conflicting policies
DROP POLICY IF EXISTS "Users can view squad membership" ON public.squad_members;
DROP POLICY IF EXISTS "Squad members can view own membership" ON public.squad_members;
DROP POLICY IF EXISTS "Trip owners can view squad members" ON public.squad_members;
DROP POLICY IF EXISTS "Authenticated users can view squad members" ON public.squad_members;

-- Apply the "Master Key" Policy
-- "If you are logged in, you can see who is in which squad."
CREATE POLICY "Authenticated users can view squad members" 
ON public.squad_members
FOR SELECT 
TO authenticated
USING (true);

-- 2. Ensure Trip Owners are correctly identified in helper function
CREATE OR REPLACE FUNCTION public.check_is_squad_member_safe(search_trip_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Check if user is a member OR the owner of the trip
    RETURN EXISTS (
        SELECT 1 FROM public.squad_members 
        WHERE trip_id = search_trip_id 
        AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.trips 
        WHERE id = search_trip_id 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verify Profiles are visible
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by any authenticated user" ON public.profiles;
CREATE POLICY "Profiles are viewable by any authenticated user" ON public.profiles
FOR SELECT TO authenticated USING (true);
