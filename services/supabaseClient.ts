
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- SHARED SUPABASE INITIALIZATION ---
// This file ensures we only create ONE instance of the Supabase client
// for the entire application, preventing "Multiple GoTrueClient instances" warnings.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

// Only initialize if keys are valid and not placeholders
if (supabaseUrl && supabaseKey && !supabaseUrl.includes("PASTE_YOUR")) {
    try {
        // Check if client already exists on window (prevent duplicates on hot-reload)
        if ((window as any).supabase) {
            supabase = (window as any).supabase;
        } else {
            supabase = createClient(supabaseUrl, supabaseKey);
            (window as any).supabase = supabase;
        }
    } catch (e) {
        console.warn("Failed to initialize Supabase client:", e);
    }
}

export { supabase };
