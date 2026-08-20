-- SquadSync Migration: Tactical Squad Coordination
-- Purpose: Enable real-time multi-user coordination, chat, presence, and polls.

-- 1. SQUAD MEMBERS (Participants)
CREATE TABLE IF NOT EXISTS squad_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Support', -- Captain, Vanguard, Support
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

-- 2. MISSION INVITES
CREATE TABLE IF NOT EXISTS mission_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE,
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MISSION COMMS (Chat)
CREATE TABLE IF NOT EXISTS mission_comms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    is_ai_trigger BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TACTICAL PRESENCE (Real-time Map tracking)
CREATE TABLE IF NOT EXISTS tactical_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    battery_level INTEGER,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. MISSION POLLS
CREATE TABLE IF NOT EXISTS mission_polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    proposal_json JSONB, -- The proposed change to the itinerary
    votes_yes UUID[] DEFAULT '{}',
    votes_no UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'Pending', -- Pending, Passed, Failed
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. REAL-TIME ENABLING
-- Ensure these tables are included in the 'supabase_realtime' publication
ALTER PUBLICATION supabase_realtime ADD TABLE mission_comms;
ALTER PUBLICATION supabase_realtime ADD TABLE tactical_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE mission_polls;

-- 7. RLS POLICIES (Privacy Sandbox)
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_comms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_polls ENABLE ROW LEVEL SECURITY;

-- Policy: Only squad members can see their group's chat
CREATE POLICY squad_comms_policy ON mission_comms
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM squad_members WHERE trip_id = mission_comms.trip_id)
    );

-- Policy: Only squad members can see each other's presence
CREATE POLICY squad_presence_policy ON tactical_presence
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM squad_members WHERE trip_id = tactical_presence.trip_id)
    );

-- Policy: Only squad members can see polls
CREATE POLICY squad_polls_policy ON mission_polls
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM squad_members WHERE trip_id = mission_polls.trip_id)
    );
