-- FIX PRESENCE CONFLICT (409 Errors)
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Ensure user_id is the ONLY Primary Key
-- If there was a composite PK (user_id, trip_id), this resets it to just user_id
ALTER TABLE public.tactical_presence DROP CONSTRAINT IF EXISTS tactical_presence_pkey;
ALTER TABLE public.tactical_presence ADD PRIMARY KEY (user_id);

-- 2. Drop potential rogue unique constraints that might conflict
ALTER TABLE public.tactical_presence DROP CONSTRAINT IF EXISTS tactical_presence_trip_id_key; 
-- (Add any other guesses if needed, but PK is the main one)

-- 3. Reset RLS Policies to be absolutely sure
ALTER TABLE public.tactical_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Users can insert own presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Users can view presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Squad members can view presence" ON public.tactical_presence;

-- Allow Users to full control their own row (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage own presence" ON public.tactical_presence
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow All Authenticated Users to see presence (Simpler for Squads)
CREATE POLICY "Users can view presence" ON public.tactical_presence
FOR SELECT
TO authenticated
USING (true);

COMMIT;
