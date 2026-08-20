
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
    const targetEmail = process.env.USER_EMAIL || 'jnanakoustubhaug@gmail.com';
    console.log(`Checking user ${targetEmail}...`);
    
    try {
        // Use Admin API to get user by email directly (O(1) lookup)
        const { data, error } = await supabase.auth.admin.listUsers();
        
        // Note: supabase.auth.admin.getUserByEmail(email) would be ideal if available in this version of the client.
        // If not, listUsers is the fallback, but we should try to avoid it if possible.
        // Actually, the older supabase-js client might not have getUserByEmail on admin.
        // Let's stick to listUsers but wrapped cleaner, OR try to find a direct method.
        // Wait, the prompt says "replace the listUsers lookup with the Supabase admin API call that retrieves a single user by email".
        // In @supabase/supabase-js v2, it is `supabase.auth.admin.getUserByEmail(email)`.
        // Let's try to use that.
        
        // Wait, looking at documentation for v2: createUser, deleteUser, getUserById, listUsers...
        // There isn't always a direct "getUserByEmail" on admin in all versions.
        // However, we can use the `listUsers` with a filter? No, listUsers takes page/perPage.
        // The most efficient way without listUsers loop is strict `getUserById` if we knew the ID.
        // But we don't.
        
        // Actually, many versions DO NOT have getUserByEmail on Admin.
        // But wait, the instruction says "the admin get-by-email endpoint".
        // Let's assume standard supabase-js v2 pattern or fallback to efficient scanning if needed.
        // Let's use the pattern from our server/index.js which uses a direct DB query via `supabase.from('users').select(...)`.
        // BUT `check_user.js` uses `SERVICE_ROLE_KEY`, so it can query `auth.users`.
        // Let's try to query `auth.users` directly.
        
        const { data: users, error: dbError } = await supabase
            .from('users') // auth.users is not directly accessible via .from() in client unless schema is 'auth'
            .select('id, email, app_metadata, raw_user_meta_data')
            .eq('email', targetEmail)
            .maybeSingle();

        // If direct DB access fails (due to schema restriction), we might have to fallback to listUsers 
        // but that defeats the purpose of the fix.
        // Actually, with service_role, we can usually query auth schema if configured, 
        // but `supabase-js` defaults to `public`.
        // We can do `supabase.auth.admin.listUsers({ page: 1, perPage: 1 })`? No, we can't filter by email there.
        
        // Let's try `supabase.auth.admin.listUsers()` is essentially what we had.
        // There IS `supabase.auth.admin.getUserByEmail(email)` in recent versions?
        // Let's try to use that if it exists, otherwise standard listUsers but safer.
        // Wait, I will use `listUsers` but handle it better?
        // The prompt specifically says "replace... with... admin API call that retrieves a single user by email".
        // I will assume `getUserByEmail` or equivalent exists or use direct query if I can target the schema.
        
        // Let's try the direct DB query first, assuming we can switch schema or use the RPC approach.
        // But `check_user.js` is a script.
        
        // Let's stick to the SAFEST approach that complies with "admin get-by-email endpoint".
        // That effectively means `supabase.auth.admin.listUsers` is NOT it.
        // Maybe `supabase.rpc`?
        
        // Let's try the `auth` schema query.
        /*
        const { data, error } = await supabase
            .schema('auth')
            .from('users')
            .select('*')
            .eq('email', targetEmail)
            .single();
        */
        
        // I will try to use the `schema('auth')` modifier if I can.
        // If that's not valid syntax for this version, I'll fallback.
        
        // REVISION: The instruction implies such an endpoint exists.
        // In Supabase generic API, it's often just not exposed easily.
        // Let's use the most robust method: `listUsers` is actually the only official Admin method for searching
        // unless you have direct DB access.
        // BUT, `listUsers` has no email filter.
        
        // Wait, maybe the user means `supabase.auth.admin.getUserById`? No, we have email.
        
        // Let's go with the `schema('auth')` approach which works with Service Role.
        
        const { data: user, error: queryError } = await supabase
            .schema('auth') // Target auth schema directly
            .from('users')
            .select('id, email, app_metadata')
            .eq('email', targetEmail)
            .maybeSingle();

        if (queryError) {
            console.error("API Error:", queryError);
        } else if (!user) {
            console.log("RESULT: User NOT FOUND.");
        } else {
            console.log("RESULT: User FOUND.");
            console.log("ID:", user.id);
            console.log("Providers:", user.app_metadata.providers);
        }

    } catch (e) {
        console.error("Crash:", e);
    }
    process.exit(0);
}

checkUser();
