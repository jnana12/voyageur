import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !serviceKey || !anonKey) {
        console.error("[api/auth/signup] Missing Supabase Env Vars");
        return res.status(500).json({ error: 'Internal Server Error', details: 'Supabase configuration missing' });
    }

    const { email, password, fullName } = req.body;
    
    try {
        const supabase = createClient(url, serviceKey);
        const supabaseAnon = createClient(url, anonKey);

        const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existingUser) return res.status(400).json({ error: "Account already exists." });

        const { data, error } = await supabaseAnon.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });

        if (error) return res.status(400).json({ error: error.message });
        res.status(200).json({ user: data.user, session: data.session });
    } catch (e) {
        console.error("[api/auth/signup] Error:", e.message);
        res.status(500).json({ error: "Server error", details: e.message });
    }
}