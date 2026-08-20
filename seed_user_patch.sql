-- TARGETED MOCK DATA SEED
-- Run this block to populate data for specific user: 9a926ed5-8f4a-4431-aace-4117a61bd8f2

DO $$
DECLARE
  target_user_id UUID := '9a926ed5-8f4a-4431-aace-4117a61bd8f2';
BEGIN
    RAISE NOTICE 'Seeding data for TARGET user: %', target_user_id;

    -- A. Update Profile
    INSERT INTO public.profiles (id, full_name, email, voyager_points, tier_level, travel_dna_archetype, travel_dna_scores)
    VALUES (
      target_user_id,
      'Voyageur Traveler',
      'user@example.com', -- Placeholder, doesn't overwrite real email in auth.users
      12500,
      'Gold',
      'Luxury Explorer',
      '{ "adventure": 75, "luxury": 65, "culture": 90, "relaxation": 40 }'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      voyager_points = 12500,
      tier_level = 'Gold',
      travel_dna_archetype = 'Luxury Explorer',
      travel_dna_scores = '{ "adventure": 75, "luxury": 65, "culture": 90, "relaxation": 40 }'::jsonb;

    -- B. Insert Mock Trips
    IF NOT EXISTS (SELECT 1 FROM public.trips WHERE user_id = target_user_id AND destination = 'Tokyo, Japan') THEN
      INSERT INTO public.trips (user_id, destination, start_date, end_date, duration, total_cost_estimated, status, itinerary_data)
      VALUES (target_user_id, 'Tokyo, Japan', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months' + INTERVAL '10 days', '10 Days', '$4,200', 'completed', '{"days": []}'::jsonb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.trips WHERE user_id = target_user_id AND destination = 'Paris, France') THEN
      INSERT INTO public.trips (user_id, destination, start_date, end_date, duration, total_cost_estimated, status, itinerary_data)
      VALUES (target_user_id, 'Paris, France', NOW(), NOW() + INTERVAL '7 days', '7 Days', '$3,500', 'active', '{"days": []}'::jsonb);
    END IF;

    -- C. Wallet
    IF NOT EXISTS (SELECT 1 FROM public.wallet_transactions WHERE user_id = target_user_id) THEN
      INSERT INTO public.wallet_transactions (user_id, description, amount, type, status)
      VALUES 
      (target_user_id, 'Deposit: Tokyo Expedition', 4200.00, 'debit', 'completed'),
      (target_user_id, 'Voyageur Credits Added', 5000.00, 'credit', 'completed');
    END IF;

    RAISE NOTICE 'Success! Data seeded for %', target_user_id;
END $$;
