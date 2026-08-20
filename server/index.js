
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Initialize Google Auth Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Initialize Supabase Admin Client (Service Role)
// We need SERVICE_ROLE_KEY to bypass RLS and check if a user exists reliably
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);


// --- RATE LIMITER (Memory-based) ---
const emailAttempts = new Map(); // email -> { count, firstAttemptAt }

function checkEmailRateLimit(email) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxPerHour = 5;
    const entry = emailAttempts.get(email) || { count: 0, firstAttemptAt: now };

    if (now - entry.firstAttemptAt > windowMs) {
        entry.count = 0;
        entry.firstAttemptAt = now;
    }

    entry.count += 1;
    emailAttempts.set(email, entry);
    return entry.count <= maxPerHour;
}

// --- AUTH ENDPOINTS ---

// Signup Endpoint
// Initialize Supabase Public Client (Anon Key) for triggering standard email flows
const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    try {
        // 1. Explicitly check if user exists (Admin Client)
        // This provides better UX than generic errors, though it allows enumeration (User accepted trade-off)
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error("Supabase Admin Check Error:", listError);
            return res.status(500).json({ error: "Server pre-check failed" });
        }

        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            // CHECK: Is the user verified?
            if (existingUser.email_confirmed_at) {
                console.log(`[Signup] Blocked duplicate signup for VERIFIED user: ${email}`);
                return res.status(400).json({ error: "Account already exists. Please Sign In." });
            } else {
                console.log(`[Signup] Existing UNVERIFIED user: ${email}. Allowing re-signup to resend OTP.`);
                // We do NOT return here. We let the code proceed to supabaseAnon.auth.signUp
                // which will trigger a new confirmation email for this unverified user.
            }
        }

        // 2. Perform Signup (Anon Client)
        // We use the Anon client here so Supabase treats it as a public signup 
        // and sends the confirmation email (if enabled in project settings).
        const { data, error } = await supabaseAnon.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });

        if (error) {
            console.error("Supabase Signup Error:", error);
            // Return specific errors for the user to fix
            return res.status(400).json({ error: error.message });
        }
        res.status(200).json({ user: data.user, session: data.session });
    } catch (e) {
        console.error("Signup Endpoint Error:", e);
        res.status(500).json({ error: "Server error" });
    }
});

// Signin Endpoint
app.post('/api/auth/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            // For security, detailed login errors should be logged server-side, 
            // but the client should receive a generic message unless it's a specific flow (like email_not_confirmed).
            if (error.message.includes("Email not confirmed")) {
                return res.status(401).json({ error: "Email not confirmed" });
            }
            return res.status(401).json({ error: "Invalid email or password" });
        }
        res.status(200).json({ user: data.user, session: data.session });
    } catch (e) {
        console.error("Signin Endpoint Error:", e);
        res.status(500).json({ error: "Server error" });
    }
});

// --- OTP STORE (Removed - using Supabase Native) ---
// const otpStore = new Map(); 

// 1. Request OTP Endpoint (Supabase Native)
app.post('/api/auth/forgot-otp-request', async (req, res) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') return res.status(400).json({ error: "Email required" });

    if (!checkEmailRateLimit(email)) {
        console.warn(`[RateLimit] Blocked OTP request for: ${email}`);
        return res.status(429).json({ message: "Too many attempts. Please try again later." });
    }

    try {
        // Check if user exists via Admin Client (Keep this check for UX)
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) {
            console.error("Supabase Admin Lookup Error:", error);
            return res.status(500).json({ error: "Server error" });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(200).json({
                message: "We could not find an account with that email. Please Sign Up.",
                success: false
            });
        }

        const providers = user.app_metadata.providers || [];
        if (providers.includes('google') && !providers.includes('email')) {
            return res.status(200).json({
                message: "This email uses Google Sign-In. Please use the 'Sign In with Google' button.",
                success: false
            });
        }

        // Trigger Supabase OTP (Email)
        // We use signInWithOtp which sends a code to the email.
        const { error: otpError } = await supabaseAnon.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false // Important: Don't sign up new users here
            }
        });

        if (otpError) {
            console.error("Supabase OTP Error:", otpError);
            return res.status(400).json({ message: otpError.message, success: false });
        }

        return res.status(200).json({
            message: "OTP sent to your email via Supabase.",
            success: true
        });

    } catch (e) {
        console.error("[OTP Request] Error:", e);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. Verify OTP Endpoint (Supabase Native)
app.post('/api/auth/forgot-otp-verify', async (req, res) => {
    const { email, otp } = req.body;

    try {
        // Verify OTP using Supabase
        const { data, error } = await supabaseAnon.auth.verifyOtp({
            email,
            token: otp,
            type: 'email'
        });

        if (error) {
            return res.status(400).json({ error: "Invalid OTP or expired." });
        }

        // If successful, we get a session in data.session
        // We return the access_token to be used as the "Reset Token"
        return res.status(200).json({
            message: "OTP Verified.",
            success: true,
            resetToken: data.session.access_token // Use the actual session token
        });

    } catch (e) {
        console.error("OTP Verify Error:", e);
        res.status(500).json({ error: "Server error" });
    }
});

// 3. Reset Password with OTP Token (Supabase Native)
app.post('/api/auth/reset-password-with-otp', async (req, res) => {
    const { email, resetToken, newPassword } = req.body;

    // Here, resetToken is actually a valid Supabase Access Token
    if (!resetToken) return res.status(401).json({ error: "Missing token." });

    try {
        // We can use the Admin client to update the user WITHOUT requiring the session checking logic 
        // IF we trust the resetToken is valid using getUser().
        // Alternatively, since we have the access_token, we can create a client FOR THIS USER 
        // and call updateUser. That is safer and more "Supabase-y".

        // Let's verify the token is valid by getting the user.
        const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(resetToken);

        if (userError || !user) {
            return res.status(401).json({ error: "Invalid or expired session. Please try again." });
        }

        if (user.email !== email) {
            return res.status(403).json({ error: "Token mismatch." });
        }

        // Now update the password using Admin (or the user context)
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        return res.status(200).json({
            message: "Password updated successfully!",
            success: true
        });

    } catch (e) {
        console.error("Reset Password Error:", e);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { token, intent } = req.body; // intent: 'login' | 'signup'

    if (!token) {
        return res.status(400).json({ error: "Missing token" });
    }

    try {
        // 1. Verify Google Token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email;

        console.log(`[Backend] Verifying user: ${email}, Intent: ${intent}`);

        // 2. Check if User exists in Supabase Auth
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error("Supabase Admin Error:", error);
            return res.status(500).json({ error: "Database check failed" });
        }

        const existingUser = users.find(u => u.email === email);
        console.log(`[Backend] User Search Result:`, { found: !!existingUser, id: existingUser?.id });

        // NEW: Check Intent (Pre-flight for Signup)
        if (intent === 'check') {
            return res.status(200).json({
                exists: !!existingUser,
                email: email,
                user: existingUser
            });
        }

        if (existingUser && intent === 'signup') {
            console.log(`[Backend] BLOCKING SIGNUP: User ${email} already exists.`);
            return res.status(409).json({
                error: "Account already exists. Please Sign In."
            });
        }

        if (!existingUser && intent === 'login') {
            console.log(`[Backend] BLOCKING LOGIN: User ${email} not found.`);
            return res.status(200).json({
                needsOnboarding: true,
                email: email
            });
        }

        console.log(`[Backend] Proceeding with session creation for ${email} (User exists: ${!!existingUser})`);

        if (existingUser) {
            console.log(`[Backend] User ${email} found. ID: ${existingUser.id}`);
        } else {
            console.log(`[Backend] Creating NEW user for ${email}`);
        }

        // 3. User Exists - Return success
        // In a real app, you might mint a custom JWT here or return the Supabase session if you exchanged the token.
        // For this flow, we just tell the frontend "It's okay to proceed with client-side auth" 
        // OR we can return a custom token.

        // Simplest for now: Tell frontend to proceed with standard Supabase OAuth flow (or handle it here).
        // Actually, since we want to prevent the "auto-create", we should probably handle the session creation HERE 
        // or tell the frontend to use a specific flow.

        // But wait, if we use client-side Supabase OAuth, it auto-redirects.
        // So the frontend should ONLY call Supabase signInWithOAuth IF this backend check passes?
        // No, because signInWithOAuth redirects to Google. We already have the Google token here.

        // So we should exchange the Google ID Token for a Supabase Session.
        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: token,
        });

        if (sessionError) {
            console.error("Session Exchange Error:", sessionError);
            return res.status(401).json({ error: "Failed to create session" });
        }

        // FORCE UPDATE METADATA
        // Ensure full_name and avatar_url are set from Google payload
        if (sessionData.user) {
            const { name, picture } = payload;
            console.log(`[Backend] Updating metadata for ${email}:`, { name, picture });

            await supabase.auth.admin.updateUserById(
                sessionData.user.id,
                { user_metadata: { full_name: name, avatar_url: picture, ...sessionData.user.user_metadata } }
            );

            // Refetch user to get updated metadata
            const { data: updatedUser } = await supabase.auth.admin.getUserById(sessionData.user.id);

            // CRITICAL: Update the user INSIDE the session object too so the frontend gets fresh data
            if (sessionData.session) {
                sessionData.session.user = updatedUser.user;
                console.log("[Backend] Updated Session User Metadata:", updatedUser.user.user_metadata);
            }

            sessionData.user = updatedUser.user;
        }

        return res.status(200).json({
            needsOnboarding: false,
            session: sessionData.session,
            user: sessionData.user
        });

    } catch (error) {
        console.error("Auth Error:", error);
        res.status(401).json({ error: "Invalid token" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
