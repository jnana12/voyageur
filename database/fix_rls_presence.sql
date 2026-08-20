-- FIX: RLS Policy for Tactical Presence Upserts
-- Run this in your Supabase SQL Editor

-- 1. Drop existing restrictive policies
drop policy if exists "Users can insert own presence" on public.tactical_presence;
drop policy if exists "Users can update own presence" on public.tactical_presence;

-- 2. Create a comprehensive UPSERT-friendly policy
-- This allows both INSERT and UPDATE if the user_id matches the authenticated user
create policy "Users can manage own presence" on public.tactical_presence
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 3. Verification
-- Ensure RLS is enabled
alter table public.tactical_presence enable row level security;
