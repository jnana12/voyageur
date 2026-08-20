-- ========================================================
-- FIX TRIPS RLS (Ensure Users Can Create Trips)
-- ========================================================

-- 1. DROP EXISTING RESTRICTIVE POLICIES
DROP POLICY IF EXISTS "Users can insert their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;

-- 2. ENABLE RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 3. CREATE PERMISSIVE POLICIES
-- Allow INSERT if you are authenticated and the user_id matches
CREATE POLICY "Users can insert their own trips" 
ON public.trips 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow SELECT if you are the owner OR if you are a squad member
-- (We use a simple logic here: if you know the ID, you can try to select it, 
-- but strict security would check squad_members. For now, let's ensure Owners can see.)
CREATE POLICY "Users can view their own trips" 
ON public.trips 
FOR SELECT 
TO authenticated 
USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
        SELECT 1 FROM public.squad_members 
        WHERE squad_members.trip_id = trips.id 
        AND squad_members.user_id = auth.uid()
    )
);

-- Allow UPDATE if you are the owner
CREATE POLICY "Users can update their own trips" 
ON public.trips 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow DELETE if you are the owner
CREATE POLICY "Users can delete their own trips" 
ON public.trips 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
