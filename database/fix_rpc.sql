-- ========================================================
-- FIX JOIN FUNCTION (RPC)
-- ========================================================
-- Run this script to ensure the "Join Mission" logic works perfectly.

-- Drop existing function if any (to avoid conflicts)
DROP FUNCTION IF EXISTS public.join_squad_by_code(uuid, text);

-- Create updated, robust function
CREATE OR REPLACE FUNCTION public.join_squad_by_code(target_user_id uuid, invite_code text)
RETURNS uuid AS $$ 
DECLARE
    found_trip_id uuid;
    is_already_member boolean;
BEGIN
    -- 1. Validate Input
    IF invite_code IS NULL OR length(invite_code) < 3 THEN
        RAISE EXCEPTION 'Invalid invite code format';
    END IF;

    -- 2. Find Trip ID by Mission Code (Case Insensitive)
    SELECT id INTO found_trip_id
    FROM public.trips
    WHERE upper(mission_code) = upper(invite_code)
    LIMIT 1;

    -- If no trip found, return NULL to signal failure
    IF found_trip_id IS NULL THEN
        RAISE NOTICE 'Mission Code not found: %', invite_code;
        RETURN NULL;
    END IF;

    -- 3. Check if user is already a member
    SELECT EXISTS(
        SELECT 1 FROM public.squad_members
        WHERE trip_id = found_trip_id AND user_id = target_user_id
    ) INTO is_already_member;

    -- If already a member, return the Trip ID (Success)
    IF is_already_member THEN
        RETURN found_trip_id;
    END IF;

    -- 4. Add the user as a 'Vanguard'
    INSERT INTO public.squad_members (trip_id, user_id, role, joined_at)
    VALUES (found_trip_id, target_user_id, 'Vanguard', now())
    ON CONFLICT (trip_id, user_id) DO NOTHING;

    -- Return the Trip ID (Success)
    RETURN found_trip_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in join_squad_by_code: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
