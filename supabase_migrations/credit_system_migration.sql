-- ========================================================
-- CREDIT SYSTEM MIGRATION (Final Secure Version)
-- ========================================================

-- 1. Add Credits Column to Profiles (if missing) with CHECK Constraint
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 1;

-- Ensure default is 1 (in case column already existed with 0)
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 1;

-- Ensure credits never go negative (Idempotent)
DO $$ 
BEGIN
    ALTER TABLE public.profiles ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Payments Table (Idempotency & Audit)
-- FIX: Used gen_random_uuid() for Supabase compatibility
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL, -- e.g., 'razorpay'
  provider_payment_id text UNIQUE NOT NULL, -- Prevents double-processing
  credits_added int NOT NULL,
  amount int NOT NULL, -- In paise/cents usually
  status text NOT NULL, -- 'success', 'failed'
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their OWN payments
DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments" ON public.payments
FOR SELECT USING ((select auth.uid()) = user_id);

-- NO INSERT POLICY (Safety Fix)
-- Users cannot directly INSERT into payments. Must use RPC.

-- 3. Atomic Function: Record Payment (RPC)
-- Replaces direct INSERT policy
CREATE OR REPLACE FUNCTION record_payment(
  p_user_id uuid,
  p_provider text,
  p_payment_id text,
  p_amount int,
  p_credits int,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security Guard
  IF (select auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'Not allowed to record payment for another user';
  END IF;

  -- Insert Idempotently
  INSERT INTO public.payments (user_id, provider, provider_payment_id, amount, credits_added, status)
  VALUES (p_user_id, p_provider, p_payment_id, p_amount, p_credits, p_status)
  ON CONFLICT (provider_payment_id) DO NOTHING;

  IF FOUND THEN
    RETURN true; -- New payment recorded
  ELSE
    RETURN false; -- Duplicate attempt
  END IF;
END;
$$;


-- 4. Atomic Function: Add Credits (RPC)
-- SECURE: Only allows adding to OWN account (MVP Security)
CREATE OR REPLACE FUNCTION add_credits(
  target_user_id uuid,
  amount int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security Guard
  IF (select auth.uid()) <> target_user_id THEN
    RAISE EXCEPTION 'Not allowed to add credits to another user';
  END IF;

  UPDATE public.profiles
  SET credits = credits + amount
  WHERE id = target_user_id;
END;
$$;

-- 5. Atomic Function: Deduct Credits (RPC)
-- SECURE: Only allows deducting from OWN account
-- CRITICAL: Checks balance >= amount before update
CREATE OR REPLACE FUNCTION deduct_credits(
  target_user_id uuid,
  amount int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security Guard
  IF (select auth.uid()) <> target_user_id THEN
    RETURN false;
  END IF;

  -- Attempt update only if balance matches condition
  UPDATE public.profiles
  SET credits = credits - amount
  WHERE id = target_user_id
    AND credits >= amount;

  -- Check if a row was actually updated
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;
