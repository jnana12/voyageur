-- RPC: Securely join a squad by invite code
-- Usage: supabase.rpc('join_squad_by_code', { target_user_id: '...', invite_code: '...' })

create or replace function public.join_squad_by_code(target_user_id uuid, invite_code text)
returns uuid as $$
declare
    found_trip_id uuid;
    is_already_member boolean;
begin
    -- 1. Validate Input
    if invite_code is null or length(invite_code) < 4 then
        raise exception 'Invalid invite code format';
    end if;

    -- 2. Find Trip by Code (Case Insensitive)
    select id into found_trip_id
    from public.trips
    where upper(mission_code) = upper(invite_code);

    if found_trip_id is null then
        return null; -- Code not found
    end if;

    -- 3. Check if already a member
    select exists(
        select 1 from public.squad_members
        where trip_id = found_trip_id and user_id = target_user_id
    ) into is_already_member;

    if is_already_member then
        return found_trip_id; -- Already joined, return success
    end if;

    -- 4. Insert new member (Vanguard role by default)
    insert into public.squad_members (trip_id, user_id, role, joined_at)
    values (found_trip_id, target_user_id, 'Vanguard', now());

    return found_trip_id;
exception
    when unique_violation then
        -- Handle race condition where user joined concurrently
        return found_trip_id;
    when others then
        raise exception 'Failed to join squad: %', sqlerrm;
end;
$$ language plpgsql security definer;
