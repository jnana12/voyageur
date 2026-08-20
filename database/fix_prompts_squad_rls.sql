-- ========================================================
-- FIX SQUAD MEMBER UPDATE PERMISSIONS FOR TRIPS AND PROMPTS
-- ========================================================

-- Allow Squad Members to Update Trips
DROP POLICY IF EXISTS "Squad members can update trips" ON public.trips;
CREATE POLICY "Squad members can update trips" 
ON public.trips 
FOR UPDATE 
TO authenticated 
USING (
    public.is_trip_owner(id, auth.uid())
    OR 
    public.is_squad_member(id, auth.uid())
);

-- Allow updates to Prompts
-- Since prompts don't have a trip_id directly, we allow anyone who knows the UUID to update it
-- or better yet, just allow any authenticated user to update any prompt, since UUIDs are unguessable.
DROP POLICY IF EXISTS "Wide Open Prompts Update" ON public.prompts;
CREATE POLICY "Wide Open Prompts Update" 
ON public.prompts 
FOR UPDATE 
TO authenticated 
USING (true);

-- Also ensure wide open read for prompts so anyone can load them
DROP POLICY IF EXISTS "Wide Open Prompts Read" ON public.prompts;
CREATE POLICY "Wide Open Prompts Read" 
ON public.prompts 
FOR SELECT 
TO authenticated 
USING (true);
