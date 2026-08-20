-- FIX: RLS Infinite Recursion Bug
-- Issue: The RLS policies for 'trips' and 'squad_members' reference each other, creating an infinite loop.
-- Solution: Use a SECURITY DEFINER function to break the circular dependency.

-- 1. Create a secure function to check squad membership
-- SECURITY DEFINER allows this function to bypass RLS policies when executed.
create or replace function public.check_is_squad_member(trip_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 
        from public.squad_members 
        where squad_members.trip_id = check_is_squad_member.trip_id 
        and squad_members.user_id = auth.uid()
    );
end;
$$ language plpgsql security definer;

-- 2. Update 'Trips' Policy to use the function
drop policy if exists "Owner/Squad can view trip" on public.trips;
create policy "Owner/Squad can view trip" on public.trips for select 
using (
    auth.uid() = user_id OR 
    public.check_is_squad_member(id)
);

-- 3. Update 'Mission Comms' Policy (Optional but recommended for consistency)
drop policy if exists "Squad members can view comms" on public.mission_comms;
create policy "Squad members can view comms" on public.mission_comms for select
using (
    exists (select 1 from public.trips where id = public.mission_comms.trip_id and user_id = auth.uid()) OR
    public.check_is_squad_member(trip_id)
);
