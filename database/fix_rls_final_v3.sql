-- FIX: RECURSION ERROR & VISIBILITY (V3 - Cascade)
-- Uses CASCADE to remove dependent policies automatically before re-creating them.

-- 1. DROP Existing Functions & Dependent Policies (CRITICAL FIX)
-- The CASCADE option is essential: it removes any existing RLS policies that rely on these functions.
drop function if exists public.check_is_squad_member(uuid) cascade;
drop function if exists public.check_is_trip_owner(uuid) cascade;

-- 2. Re-Create Helper Functions (Bypass RLS)
create or replace function public.check_is_squad_member(target_trip_id uuid)
returns boolean as $$
begin
    return exists (select 1 from public.squad_members where trip_id = target_trip_id and user_id = auth.uid());
end;
$$ language plpgsql security definer;

create or replace function public.check_is_trip_owner(target_trip_id uuid)
returns boolean as $$
begin
    return exists (select 1 from public.trips where id = target_trip_id and user_id = auth.uid());
end;
$$ language plpgsql security definer;

-- 3. Re-Create Policies (Since CASCADE deleted them)
-- We explicitly re-create ALL dependent policies to ensure they are correct.

-- A) Squad Members Policy
drop policy if exists "Users can view squad membership" on public.squad_members;
create policy "Users can view squad membership" on public.squad_members for select 
using (
    auth.uid() = user_id OR
    public.check_is_squad_member(trip_id) OR
    public.check_is_trip_owner(trip_id)
);

-- B) Profiles Policy
drop policy if exists "Squad members can view co-member profiles" on public.profiles;
create policy "Squad members can view co-member profiles" on public.profiles for select using (
    exists (
        select 1 
        from public.squad_members sm
        where sm.user_id = public.profiles.id
        and (public.check_is_squad_member(sm.trip_id) OR public.check_is_trip_owner(sm.trip_id))
    )
);

-- C) Trips Policy
drop policy if exists "Owner/Squad can view trip" on public.trips;
create policy "Owner/Squad can view trip" on public.trips for select 
using (auth.uid() = user_id OR public.check_is_squad_member(id));

-- D) Mission Comms Policy
drop policy if exists "Squad members can view comms" on public.mission_comms;
create policy "Squad members can view comms" on public.mission_comms for select
using (
    public.check_is_trip_owner(trip_id) OR
    public.check_is_squad_member(trip_id)
);
