CREATE TABLE IF NOT EXISTS public.geocoding_cache (
    query text PRIMARY KEY,
    result jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

-- Allow ANY authenticated user to read from the cache
DROP POLICY IF EXISTS "Anyone can read geocoding cache" ON public.geocoding_cache;
CREATE POLICY "Anyone can read geocoding cache" ON public.geocoding_cache FOR SELECT USING (auth.role() = 'authenticated');

-- Allow ANY authenticated user to insert into the cache
DROP POLICY IF EXISTS "Anyone can insert geocoding cache" ON public.geocoding_cache;
CREATE POLICY "Anyone can insert geocoding cache" ON public.geocoding_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow ANY authenticated user to update the cache
DROP POLICY IF EXISTS "Anyone can update geocoding cache" ON public.geocoding_cache;
CREATE POLICY "Anyone can update geocoding cache" ON public.geocoding_cache FOR UPDATE USING (auth.role() = 'authenticated');
