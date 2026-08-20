-- Voyageur Database Schema - COMPLETE RESET
-- Run this SQL in your Supabase SQL Editor
-- WARNING: This will delete all existing trip and prompt data!

-- Drop existing tables (if any) to start fresh
DROP TABLE IF EXISTS public.prompts CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;

-- Create the trips table with all required columns
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination text,
  total_cost text,
  duration text,
  data jsonb,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Create the prompts table with all required columns
CREATE TABLE public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Policies for trips table
CREATE POLICY "Users can insert their own trips"
ON public.trips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own trips"
ON public.trips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
ON public.trips FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
ON public.trips FOR DELETE
USING (auth.uid() = user_id);

-- Policies for prompts table
CREATE POLICY "Users can insert their own prompts"
ON public.prompts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own prompts"
ON public.prompts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
ON public.prompts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
ON public.prompts FOR DELETE
USING (auth.uid() = user_id);

-- Verify tables were created (optional check)
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name IN ('trips', 'prompts')
ORDER BY table_name, ordinal_position;
