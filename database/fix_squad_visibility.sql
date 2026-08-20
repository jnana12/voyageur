-- FIX: Squad Visibility (0 Users / Missing Avatars)
-- Issue: Current RLS only allows you to see YOURSELF in the squad, hiding other members.
-- Solution: Allow viewing ALL members of a trip if you are also a member (or the owner).

-- 1. Drop the restrictive policy
drop policy if exists "Users can view squad membership" on public.squad_members;

-- 2. Create the inclusive policy
-- We use the safe function check_is_squad_member (created in previous step) to avoid recursion
-- if possible, OR we use a direct EXISTS check if that function is not available.
-- Given we just added check_is_squad_member, we should rely on it for consistency OR
-- replicate the logic safely.

create policy "Users can view squad membership" on public.squad_members for select 
using (
    -- Can see if it's ME
    auth.uid() = user_id
    OR
    -- Can see if I am a member of the SAME trip
    exists (
        select 1 
        from public.squad_members as my_membership 
        where my_membership.trip_id = public.squad_members.trip_id 
        and my_membership.user_id = auth.uid()
    )
    OR
    -- Can see if I am the OWNER of the trip
    exists (
        select 1
        from public.trips
        where id = public.squad_members.trip_id
        and user_id = auth.uid()
    )
);

-- 3. Fix Profiles Visibility (Ensure we can see names/avatars of squadmates)
drop policy if exists "Squad members can view co-member profiles" on public.profiles;
create policy "Squad members can view co-member profiles" on public.profiles for select using (
    exists (
        select 1 
        from public.squad_members sm1
        join public.squad_members sm2 on sm1.trip_id = sm2.trip_id
        where sm1.user_id = auth.uid() and sm2.user_id = public.profiles.id
    )
);
