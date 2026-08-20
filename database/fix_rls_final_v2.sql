-- FIX: RECURSION ERROR & VISIBILITY (V2 - Corrected)
-- Explicitly drops functions to avoid "cannot change name of input parameter" error.

-- 1. DROP Existing Functions (CRITICAL FIX)
drop function if exists public.check_is_squad_member(uuid);
drop function if exists public.check_is_trip_owner(uuid);

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

-- 3. Update Policies to use Functions (No more raw joins!)
drop policy if exists "Users can view squad membership" on public.squad_members;
create policy "Users can view squad membership" on public.squad_members for select 
using (
    auth.uid() = user_id OR
    public.check_is_squad_member(trip_id) OR
    public.check_is_trip_owner(trip_id)
);

drop policy if exists "Squad members can view co-member profiles" on public.profiles;
create policy "Squad members can view co-member profiles" on public.profiles for select using (
    exists (
        select 1 
        from public.squad_members sm
        where sm.user_id = public.profiles.id
        and (public.check_is_squad_member(sm.trip_id) OR public.check_is_trip_owner(sm.trip_id))
    )
);

-- Ensure Trips policy uses the function too
drop policy if exists "Owner/Squad can view trip" on public.trips;
create policy "Owner/Squad can view trip" on public.trips for select 
using (auth.uid() = user_id OR public.check_is_squad_member(id));
