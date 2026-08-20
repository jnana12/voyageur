
(async () => {
    console.log("🛠️ Starting Trip Save Diagnostic...");
    const { dbService } = await import('./services/dbService');
    const { supabase } = await import('./services/supabaseClient');

    const auth = await supabase.auth.getUser();
    if (!auth.data.user) {
        console.error("❌ Not Logged In!");
        return;
    }
    const userId = auth.data.user.id;
    console.log("👤 User:", userId);

    console.log("💾 Attempting to save dummy trip...");
    const dummyTrip = { destination: "Diagnostics Land", duration: "1 Day" };

    // Manual Supabase Insert to see RAW error
    const tripId = crypto.randomUUID();
    const { data, error } = await supabase.from('trips').insert({
        id: tripId,
        user_id: userId,
        destination: "Diagnostics Land",
        status: 'draft',
        mission_code: 'TEST-' + Math.floor(Math.random() * 1000)
    }).select();

    if (error) {
        console.error("❌ Supabase Insert Failed:", error);
    } else {
        console.log("✅ Supabase Insert Success:", data);
        // Clean up
        await supabase.from('trips').delete().eq('id', tripId);
    }
})();
