import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        console.error("[api/auth/signin] Missing Supabase Env Vars");
        return res.status(500).json({ error: 'Internal Server Error', details: 'Supabase configuration missing' });
    }

    const { email, password } = req.body;
    
    try {
        const supabase = createClient(url, serviceKey);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return res.status(401).json({ error: "Invalid credentials" });
        res.status(200).json({ user: data.user, session: data.session });
    } catch (e) {
        console.error("[api/auth/signin] Error:", e.message);
        res.status(500).json({ error: "Server error", details: e.message });
    }
}