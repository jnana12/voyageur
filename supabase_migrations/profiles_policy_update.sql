-- ========================================================
-- PROFILES RLS UPDATE
-- Ensure users can update their own profile information
-- ========================================================

-- Enable RLS (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it conflicts (to be safe/idempotent)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create policy allowing users to update their own row
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Explicitly allow updating full_name
-- (Postgres triggers might handle other fields, but this policy covers the row)
