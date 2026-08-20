import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const googleId = process.env.GOOGLE_CLIENT_ID;
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!googleId || !url || !serviceKey) {
        console.error("[api/auth/google] Missing Env Vars");
        return res.status(500).json({ error: 'Internal Server Error', details: 'Environment configuration missing' });
    }

    const { token } = req.body;
    
    try {
        const client = new OAuth2Client(googleId);
        const ticket = await client.verifyIdToken({ idToken: token, audience: googleId });
        const { name, picture } = ticket.getPayload();
        
        const supabase = createClient(url, serviceKey);
        const { data: sessionData, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
        
        if (error) return res.status(401).json({ error: "Auth failed", details: error.message });

        if (sessionData.user) {
            await supabase.auth.admin.updateUserById(sessionData.user.id, { 
                user_metadata: { full_name: name, avatar_url: picture, ...sessionData.user.user_metadata } 
            });
        }
        res.status(200).json({ session: sessionData.session, user: sessionData.user });
    } catch (e) {
        console.error("[api/auth/google] Error:", e.message);
        res.status(401).json({ error: "Invalid token", details: e.message });
    }
}