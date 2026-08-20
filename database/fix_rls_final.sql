-- FIX: RLS Infinite Recursion & Visibility (FINAL)
-- Issue: The RLS policies for 'trips' and 'squad_members' reference each other, creating an infinite loop.
-- Solution: Use SECURITY DEFINER functions to break circular dependencies for ALL tables.

-- 1. Helper Function: Check Squad Membership (SECURITY DEFINER)
create or replace function public.check_is_squad_member(target_trip_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 
        from public.squad_members 
        where trip_id = target_trip_id 
        and user_id = auth.uid()
    );
end;
$$ language plpgsql security definer;

-- 2. Helper Function: Check Trip Ownership (SECURITY DEFINER)
create or replace function public.check_is_trip_owner(target_trip_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 
        from public.trips 
        where id = target_trip_id 
        and user_id = auth.uid()
    );
end;
$$ language plpgsql security definer;

-- 3. Update 'Trips' Policy
drop policy if exists "Owner/Squad can view trip" on public.trips;
create policy "Owner/Squad can view trip" on public.trips for select 
using (
    auth.uid() = user_id OR 
    public.check_is_squad_member(id)
);

-- 4. Update 'Squad Members' Policy (Avoids self-referencing recursion)
drop policy if exists "Users can view squad membership" on public.squad_members;
create policy "Users can view squad membership" on public.squad_members for select 
using (
    auth.uid() = user_id -- Can see myself
    OR
    public.check_is_squad_member(trip_id) -- can see if I am a member of this trip
    OR
    public.check_is_trip_owner(trip_id) -- can see if I am the trip owner
);

-- 5. Update 'Mission Comms' Policy
drop policy if exists "Squad members can view comms" on public.mission_comms;
create policy "Squad members can view comms" on public.mission_comms for select
using (
    public.check_is_trip_owner(trip_id) OR
    public.check_is_squad_member(trip_id)
);

-- 6. Update 'Profiles' Policy (For avatars/names)
drop policy if exists "Squad members can view co-member profiles" on public.profiles;
create policy "Squad members can view co-member profiles" on public.profiles for select using (
    exists (
        select 1 
        from public.squad_members sm
        where sm.user_id = public.profiles.id
        and (
             public.check_is_squad_member(sm.trip_id) OR 
             public.check_is_trip_owner(sm.trip_id)
        )
    )
);
