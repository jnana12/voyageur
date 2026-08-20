-- ==========================================
-- VOYAGEUR MASTER DATABASE SCHEMA
-- Version: 2.2.0 (Recursion & Encoding Fix)
-- ==========================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Profiles & Credits
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    full_name text,
    avatar_url text,
    credits integer default 10 not null,
    updated_at timestamp with time zone default now()
);

-- Core Missions (Trips)
create table if not exists public.trips (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    destination text not null,
    total_cost text,
    duration text,
    status text default 'draft' check (status in ('draft', 'confirmed', 'completed', 'paused', 'cancelled')),
    data jsonb not null default '{}'::jsonb,
    mission_code text unique,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now()
);

-- AI Parameter Stream (Prompts)
create table if not exists public.prompts (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    prompt text not null,
    destination text,
    status text default 'ready' check (status in ('generating', 'ready', 'failed', 'confirmed', 'completed', 'consumed')),
    result jsonb,
    error text,
    created_at timestamp with time zone default now() not null
);

-- SquadSync: Members
create table if not exists public.squad_members (
    trip_id uuid references public.trips on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    role text default 'Vanguard' check (role in ('Captain', 'Vanguard', 'Specialist')),
    joined_at timestamp with time zone default now(),
    primary key (trip_id, user_id)
);

-- SquadSync: Communications
create table if not exists public.mission_comms (
    id uuid default uuid_generate_v4() primary key,
    trip_id uuid references public.trips on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    message text not null,
    is_ai_trigger boolean default false,
    created_at timestamp with time zone default now()
);

-- SquadSync: Tactical Presence
create table if not exists public.tactical_presence (
    user_id uuid references auth.users on delete cascade not null primary key,
    trip_id uuid references public.trips on delete cascade not null,
    lat double precision not null,
    lng double precision not null,
    battery_level integer,
    last_seen timestamp with time zone default now()
);

-- SquadSync: Mission Objectives (Polls)
create table if not exists public.mission_polls (
    id uuid default uuid_generate_v4() primary key,
    trip_id uuid references public.trips on delete cascade not null,
    question text not null,
    options jsonb not null, -- Array of {id, text}
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- SquadSync: Poll Votes
create table if not exists public.poll_votes (
    poll_id uuid references public.mission_polls on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    option_id text not null,
    primary key (poll_id, user_id)
);

-- 3. INDEXING FOR PERFORMANCE
create index if not exists idx_trips_user_id on public.trips(user_id);
create index if not exists idx_trips_mission_code on public.trips(mission_code);
create index if not exists idx_prompts_user_id on public.prompts(user_id);
create index if not exists idx_squad_trip_id on public.squad_members(trip_id);
create index if not exists idx_comms_trip_id on public.mission_comms(trip_id);
create index if not exists idx_presence_trip_id on public.tactical_presence(trip_id);

-- 4. RLS HELPER FUNCTIONS (Security Definer to break recursion)
-- These must be defined BEFORE the policies that use them.

create or replace function public.is_squad_member(p_trip_id uuid, p_user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.squad_members sm 
        where sm.trip_id = p_trip_id and sm.user_id = p_user_id
    );
end;
$$ language plpgsql security definer;

create or replace function public.is_trip_owner(p_trip_id uuid, p_user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.trips t 
        where t.id = p_trip_id and t.user_id = p_user_id
    );
end;
$$ language plpgsql security definer;

create or replace function public.can_access_trip(p_trip_id uuid, p_user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.trips t where t.id = p_trip_id and t.user_id = p_user_id
    ) or exists (
        select 1 from public.squad_members sm where sm.trip_id = p_trip_id and sm.user_id = p_user_id
    );
end;
$$ language plpgsql security definer;

create or replace function public.check_co_member_access(p_auth_id uuid, p_target_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 
        from public.squad_members sm1
        join public.squad_members sm2 on sm1.trip_id = sm2.trip_id
        where sm1.user_id = p_auth_id and sm2.user_id = p_target_id
    ) or exists (
        select 1 
        from public.squad_members sm
        join public.trips t on sm.trip_id = t.id
        where sm.user_id = p_auth_id and t.user_id = p_target_id
    ) or exists (
        select 1 
        from public.trips t
        join public.squad_members sm on t.id = sm.trip_id
        where t.user_id = p_auth_id and sm.user_id = p_target_id
    );
end;
$$ language plpgsql security definer;

-- Securely join a squad by invite code
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
        return found_trip_id;
    when others then
        raise exception 'Failed to join squad: %', sqlerrm;
end;
$$ language plpgsql security definer;

-- Credit deduction logic
create or replace function public.deduct_credits(target_user_id uuid, amount integer)
returns boolean as $$
declare
    current_credits integer;
begin
    select credits into current_credits from public.profiles where id = target_user_id;
    if current_credits < amount then
        return false;
    end if;
    update public.profiles set credits = credits - amount where id = target_user_id;
    return true;
end;
$$ language plpgsql security definer;

-- 5. ROW LEVEL SECURITY (RLS)

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.prompts enable row level security;
alter table public.squad_members enable row level security;
alter table public.mission_comms enable row level security;
alter table public.tactical_presence enable row level security;
alter table public.mission_polls enable row level security;
alter table public.poll_votes enable row level security;

-- Squad Members: Policies
drop policy if exists "Users can view squad membership" on public.squad_members;
create policy "Users can view squad membership" on public.squad_members for select 
using (public.can_access_trip(trip_id, auth.uid()));

drop policy if exists "Users can join squads" on public.squad_members;
create policy "Users can join squads" on public.squad_members for insert with check (auth.uid() = user_id);

drop policy if exists "Users can leave squads" on public.squad_members;
create policy "Users can leave squads" on public.squad_members for delete using (auth.uid() = user_id);

drop policy if exists "Trip owners can remove squad members" on public.squad_members;
create policy "Trip owners can remove squad members" on public.squad_members for delete
using (public.is_trip_owner(trip_id, auth.uid()));

-- Profiles: Policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Squad members can view co-member profiles" on public.profiles;
create policy "Squad members can view co-member profiles" on public.profiles for select 
using (public.check_co_member_access(auth.uid(), id));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trips: Policies
drop policy if exists "Owner/Squad can view trip" on public.trips;
create policy "Owner/Squad can view trip" on public.trips for select 
using (public.can_access_trip(id, auth.uid()));

drop policy if exists "Owners can update trips" on public.trips;
create policy "Owners can update trips" on public.trips for update using (auth.uid() = user_id);

drop policy if exists "Owners can delete trips" on public.trips;
create policy "Owners can delete trips" on public.trips for delete using (auth.uid() = user_id);

drop policy if exists "Users can create trips" on public.trips;
create policy "Users can create trips" on public.trips for insert with check (auth.uid() = user_id);

-- Mission Comms: Policies
drop policy if exists "Squad members can view comms" on public.mission_comms;
create policy "Squad members can view comms" on public.mission_comms for select
using (public.can_access_trip(trip_id, auth.uid()));

drop policy if exists "Squad members can send comms" on public.mission_comms;
create policy "Squad members can send comms" on public.mission_comms for insert
with check (public.can_access_trip(trip_id, auth.uid()));

-- Tactical Presence: Policies
drop policy if exists "Squad members can view presence" on public.tactical_presence;
create policy "Squad members can view presence" on public.tactical_presence for select
using (public.can_access_trip(trip_id, auth.uid()));

drop policy if exists "Users can insert own presence" on public.tactical_presence;
create policy "Users can insert own presence" on public.tactical_presence for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own presence" on public.tactical_presence;
create policy "Users can update own presence" on public.tactical_presence for update using (auth.uid() = user_id);

-- 6. REALTIME CONFIGURATION
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mission_comms') then
    alter publication supabase_realtime add table public.mission_comms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tactical_presence') then
    alter publication supabase_realtime add table public.tactical_presence;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mission_polls') then
    alter publication supabase_realtime add table public.mission_polls;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'poll_votes') then
    alter publication supabase_realtime add table public.poll_votes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'squad_members') then
    alter publication supabase_realtime add table public.squad_members;
  end if;
exception
  when undefined_object then
    null;
end $$;