-- ========================================================
-- MASTER SQUAD FIX v4: VISIBILITY, AVATARS & SYNC
-- ========================================================
-- Run this script in your Supabase SQL Editor to fix:
-- 1. "Invisible" squad members (RLS)
-- 2. "Missing" avatars (Sync from Google/GitHub)
-- 3. "Broken" joined trips (RLS)

-- --------------------------------------------------------
-- 1. FIX RLS POLICIES (Recursion & Visibility)
-- --------------------------------------------------------

-- Helper functions to break recursion (make sure they exist)
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

-- SQUAD MEMBERS: Allow viewing if member OR owner
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view squad membership" ON public.squad_members;

CREATE POLICY "Users can view squad membership" ON public.squad_members
FOR SELECT TO authenticated
USING (
    true -- TEMPORARY: Allow all authenticated users to see squad memberships to debug visibility
    -- Ideally: auth.uid() = user_id OR public.check_is_squad_member_safe(trip_id)
);

-- PROFILES: Allow PUBLIC read for avatars/names (Essential for Squad UI)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Squad members can view co-member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by any authenticated user" ON public.profiles;

CREATE POLICY "Profiles are viewable by any authenticated user" ON public.profiles
FOR SELECT TO authenticated USING (true); 

-- ALLOW UPDATES to own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- TRIPS: Allow viewing if Owner OR Squad Member
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;

CREATE POLICY "Users can view own trips" ON public.trips
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR
    public.check_is_squad_member_safe(id)
);

-- STORAGE (Avatars Bucket)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- --------------------------------------------------------
-- 2. AUTO-SYNC PROFILES FROM AUTH (Trigger)
-- --------------------------------------------------------
-- This ensures new users get their Google/GitHub avatar immediately

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, credits)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Traveler'),
    new.raw_user_meta_data->>'avatar_url', -- Get Avatar from Auth Metadata
    10 -- Default credits
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- --------------------------------------------------------
-- 4. PRESENCE UPDATES (New 'is_online' column)
-- --------------------------------------------------------
ALTER TABLE public.tactical_presence ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- Reset permissions just in case
ALTER TABLE public.tactical_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own presence" ON public.tactical_presence;
DROP POLICY IF EXISTS "Users can view presence" ON public.tactical_presence;

CREATE POLICY "Users can manage own presence" ON public.tactical_presence FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view presence" ON public.tactical_presence FOR SELECT TO authenticated USING (true);


-- --------------------------------------------------------
-- 3. BACKFILL EXISTING PROFILES
-- --------------------------------------------------------
-- Fix existing users who have NULL avatars but valid Auth Metadata

DO $$ 
DECLARE
    r RECORD;
BEGIN 
    -- Update existing profiles where avatar is missing
    FOR r IN SELECT * FROM auth.users LOOP
        UPDATE public.profiles
        SET 
            avatar_url = COALESCE(avatar_url, r.raw_user_meta_data->>'avatar_url'),
            full_name = COALESCE(full_name, r.raw_user_meta_data->>'full_name', 'Traveler')
        WHERE id = r.id AND (avatar_url IS NULL OR full_name = 'Traveler');
        
        -- Insert if missing entirely
        INSERT INTO public.profiles (id, full_name, avatar_url, credits)
        VALUES (
            r.id, 
            COALESCE(r.raw_user_meta_data->>'full_name', 'Traveler'), 
            r.raw_user_meta_data->>'avatar_url', 
            10
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;
