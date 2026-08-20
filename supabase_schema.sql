-- VOYAGEUR FULL DATABASE SCHEMA
-- This script sets up the entire backend structure for the application.

-- 1. Enable UUID extension for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. USERS & PROFILES
-- ==========================================
-- Extends the default Supabase auth.users to store app-specific data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  
  -- Gamification & Rewards
  voyager_points INTEGER DEFAULT 0,
  tier_level TEXT DEFAULT 'Bronze', -- Bronze, Silver, Gold, Platinum
  
  -- Travel DNA (Personality Analysis)
  travel_dna_archetype TEXT, -- e.g. 'Explorer', 'Luxury'
  travel_dna_scores JSONB DEFAULT '{}'::jsonb, -- Store scores { "adventure": 80, "luxury": 20 }
  
  -- Impact Stats
  total_co2_offset_kg DECIMAL(10, 2) DEFAULT 0.00,
  trees_planted INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. TRIPS & ITINERARIES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Core Trip Data
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  duration TEXT,
  
  -- Analytics
  total_cost_estimated TEXT, -- Stored as string "$1,200" or decimal
  co2_footprint_kg DECIMAL(10, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'planned', -- planned, active, completed, cancelled
  
  -- The Full AI Generated JSON
  itinerary_data JSONB NOT NULL, 
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. PROMPT HISTORY
-- ==========================================
CREATE TABLE IF NOT EXISTS public.prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  prompt_text TEXT NOT NULL,
  ai_model_used TEXT DEFAULT 'gemini-2.5-flash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. WALLET & TRANSACTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  description TEXT NOT NULL, -- e.g., "Booking Deposit: Tokyo"
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit')), -- 'credit' (add money) or 'debit' (spend)
  status TEXT DEFAULT 'completed',
  
  reference_id UUID, -- Optional link to a trip_id or order_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. DINING & SAVED ITEMS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.saved_restaurants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  location TEXT,
  cuisine TEXT,
  rating TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. ACHIEVEMENTS & BADGES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  badge_code TEXT NOT NULL, -- e.g., 'GLOBE_TROTTER_1'
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. REFERRALS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  referred_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, joined, rewarded
  reward_amount_points INTEGER DEFAULT 1000,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Secure the data so users can only access their own records

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- DROP EXISTING POLICIES TO AVOID ERRORS ON RE-RUN
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trips;

DROP POLICY IF EXISTS "Users can view own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can insert own prompts" ON public.prompts;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view own restaurants" ON public.saved_restaurants; 
DROP POLICY IF EXISTS "Users can manage saved restaurants" ON public.saved_restaurants;

DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert own referrals" ON public.referrals;

-- -------------------------------------------------------------
-- CREATE POLICIES (Generic "Own Data" Policy)
-- -------------------------------------------------------------
-- PERFORMANCE FIX: Using (select auth.uid()) improves query caching

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can view own trips" ON public.trips FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own trips" ON public.trips FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own prompts" ON public.prompts FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own prompts" ON public.prompts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own wallet" ON public.wallet_transactions FOR SELECT USING ((select auth.uid()) = user_id);
-- Removing redundant "view" policy for restaurants since "manage" covers ALL (including SELECT)
CREATE POLICY "Users can manage saved restaurants" ON public.saved_restaurants FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING ((select auth.uid()) = user_id);

-- Fix: Added missing policies for REFERRALS
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING ((select auth.uid()) = referrer_id);
CREATE POLICY "Users can insert own referrals" ON public.referrals FOR INSERT WITH CHECK ((select auth.uid()) = referrer_id);

-- ==========================================
-- 10. AUTOMATION TRIGGERS
-- ==========================================

-- Function to handle new user signup
-- SECURITY FIX: Added SET search_path = public to prevent path hijacking
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, voyager_points, tier_level)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    500, -- Sign up bonus
    'Bronze'
  );
  return new;
END;
$$;

-- Trigger: Run function when a user is created in Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 11. MOCK DATA GENERATOR (SEED)
-- ==========================================
-- Run this block to automatically populate the FIRST user in your database with demo data.
-- This is useful for development to immediately visualize the dashboard.

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 1. Find the first user in the auth table
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Seeding data for user: %', target_user_id;

    -- A. Update Profile with Travel DNA & Stats
    UPDATE public.profiles 
    SET 
      tier_level = 'Gold',
      voyager_points = 12500,
      total_co2_offset_kg = 450.50,
      travel_dna_archetype = 'Luxury Explorer',
      travel_dna_scores = '{
        "adventure": 75, 
        "luxury": 65, 
        "culture": 90, 
        "relaxation": 40
      }'::jsonb
    WHERE id = target_user_id;

    -- B. Insert Mock Trips (Check if exists first to avoid duplicates if re-run)
    IF NOT EXISTS (SELECT 1 FROM public.trips WHERE user_id = target_user_id AND destination = 'Tokyo, Japan') THEN
      INSERT INTO public.trips (user_id, destination, start_date, end_date, duration, total_cost_estimated, status, itinerary_data)
      VALUES (
        target_user_id,
        'Tokyo, Japan',
        NOW() - INTERVAL '3 months',
        NOW() - INTERVAL '3 months' + INTERVAL '10 days',
        '10 Days',
        '$4,200',
        'completed',
        '{"days": []}'::jsonb
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.trips WHERE user_id = target_user_id AND destination = 'Paris, France') THEN
      INSERT INTO public.trips (user_id, destination, start_date, end_date, duration, total_cost_estimated, status, itinerary_data)
      VALUES (
        target_user_id,
        'Paris, France',
        NOW(),
        NOW() + INTERVAL '7 days',
        '7 Days',
        '$3,500',
        'active',
        '{"days": []}'::jsonb
      );
    END IF;

    -- C. Insert Wallet Transactions
    IF NOT EXISTS (SELECT 1 FROM public.wallet_transactions WHERE user_id = target_user_id) THEN
      INSERT INTO public.wallet_transactions (user_id, description, amount, type, status)
      VALUES 
      (target_user_id, 'Deposit: Tokyo Expedition', 4200.00, 'debit', 'completed'),
      (target_user_id, 'Voyageur Credits Added', 5000.00, 'credit', 'completed');
    END IF;

    -- D. Insert Prompts
    IF NOT EXISTS (SELECT 1 FROM public.prompts WHERE user_id = target_user_id) THEN
      INSERT INTO public.prompts (user_id, prompt_text)
      VALUES 
      (target_user_id, 'Plan a 2-week trip to Japan focusing on anime and food'),
      (target_user_id, 'Best luxury hotels in Paris with Eiffel Tower view');
    END IF;

    -- E. Insert Badges
    IF NOT EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = target_user_id) THEN
      INSERT INTO public.user_badges (user_id, badge_code, badge_name)
      VALUES 
      (target_user_id, 'FIRST_FLIGHT', 'Maiden Voyage'),
      (target_user_id, 'HIGH_ROLLER', 'Velvet Rope Access');
    END IF;

  ELSE
    RAISE NOTICE 'No users found to seed. Please Sign Up first, then run this block again.';
  END IF;
END $$;
