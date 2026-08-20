-- ==========================================
-- FIX MISSING RLS POLICIES (REVISED)
-- Target Tables: prompts, mission_polls, poll_votes
-- ==========================================

-- 1. Prompts: Policies
-- Drop all existing to be clean
drop policy if exists "Users can view own prompts" on public.prompts;
drop policy if exists "Users can insert own prompts" on public.prompts;
drop policy if exists "Users can update own prompts" on public.prompts;
drop policy if exists "prompts_owner_all" on public.prompts;

-- Enable RLS (just in case)
alter table public.prompts enable row level security;

-- COMPREHENSIVE POLICY: User can do anything to rows they own
-- This is critical for upsert operations which need SELECT, INSERT, and UPDATE permissions
create policy "prompts_owner_all" on public.prompts 
for all 
using (auth.uid() = user_id) 
with check (auth.uid() = user_id);


-- 2. Mission Polls: Policies (Squad-based)
drop policy if exists "Squad members can view mission polls" on public.mission_polls;
create policy "Squad members can view mission polls" on public.mission_polls for select
using (public.can_access_trip(trip_id, auth.uid()));

drop policy if exists "Squad members can create polls" on public.mission_polls;
create policy "Squad members can create polls" on public.mission_polls for insert
with check (public.can_access_trip(trip_id, auth.uid()));


-- 3. Poll Votes: Policies
drop policy if exists "Users can view poll votes" on public.poll_votes;
create policy "Users can view poll votes" on public.poll_votes for select
using (
    exists (
        select 1 from public.mission_polls mp
        where mp.id = poll_id and public.can_access_trip(mp.trip_id, auth.uid())
    )
);

drop policy if exists "Users can cast own votes" on public.poll_votes;
create policy "Users can cast own votes" on public.poll_votes for insert
with check (
    auth.uid() = user_id AND
    exists (
        select 1 from public.mission_polls mp
        where mp.id = poll_id and public.can_access_trip(mp.trip_id, auth.uid())
    )
);

drop policy if exists "Users can update own votes" on public.poll_votes;
create policy "Users can update own votes" on public.poll_votes for update
using (auth.uid() = user_id)
with check (
    exists (
        select 1 from public.mission_polls mp
        where mp.id = poll_id and public.can_access_trip(mp.trip_id, auth.uid())
    )
);
