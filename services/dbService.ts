
import { TripItinerary, StoredTrip, StoredPrompt } from '../types';
import { supabase } from './supabaseClient';

// Load env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ Supabase credentials missing! App will run in offline mode.");
}

// Helper to handle RPC errors uniformly
const handleRpcError = (error: any, context: string) => {
    console.error(`❌ [${context}] Error:`, error);
    throw new Error(error.message || `Failed to ${context}`);
};

export const getTripsKey = (userId: string) => `voyageur_trips_v1_${userId}`;
export const getPromptsKey = (userId: string) => `voyageur_prompts_${userId}`;
const DELETED_KEY = 'voyageur_deleted_ids_v2'; // Rotated key to clear old cache

// --- LOCAL STORAGE HELPERS ---

const markAsDeleted = (id: string, userId?: string) => {
    if (typeof localStorage === 'undefined') return;
    try {
        const raw = localStorage.getItem(DELETED_KEY);
        const deleted = raw ? JSON.parse(raw) : {};
        deleted[id] = Date.now();
        localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
        console.log(`🗑️ [dbService] Marked trip ${id} as deleted locally.`);

        // Also force remove from the specific user's trip list immediately to be safe
        if (userId) {
            const key = getTripsKey(userId);
            const rawTrips = localStorage.getItem(key);
            if (rawTrips) {
                const trips = JSON.parse(rawTrips);
                const filtered = trips.filter((t: any) => t.id !== id);
                if (filtered.length !== trips.length) {
                    localStorage.setItem(key, JSON.stringify(filtered));
                    console.log(`🗑️ [dbService] Also pruned trip ${id} from user list ${key}`);
                }
            }
        }
    } catch (e) {
        console.error("Failed to mark trip as deleted in cache:", e);
    }
};

const getRecentDeletions = () => {
    if (typeof localStorage === 'undefined') return new Set<string>();
    try {
        const raw = localStorage.getItem(DELETED_KEY);
        if (!raw) return new Set<string>();

        const deleted = JSON.parse(raw);
        const now = Date.now();
        const expiry = 5 * 60 * 1000; // 5 mins grace period
        const validIds = new Set<string>();
        let expiredFound = false;

        Object.keys(deleted).forEach(id => {
            if (now - deleted[id] < expiry) {
                validIds.add(id);
            } else {
                expiredFound = true;
            }
        });

        if (expiredFound) {
            const cleaned: Record<string, number> = {};
            validIds.forEach(id => cleaned[id] = deleted[id]);
            localStorage.setItem(DELETED_KEY, JSON.stringify(cleaned));
        }
        return validIds;
    } catch (e) {
        console.warn("Error parsing deleted trips cache, resetting:", e);
        localStorage.removeItem(DELETED_KEY);
        return new Set<string>();
    }
};

const saveLocalTrip = (userId: string, trip: TripItinerary): string => {
    const key = getTripsKey(userId);
    const trips = JSON.parse(localStorage.getItem(key) || '[]');
    const newTrip: StoredTrip = {
        id: crypto.randomUUID(),
        user_id: userId,
        destination: trip.destination,
        total_cost: trip.totalEstimatedCost,
        duration: trip.duration,
        data: trip,
        status: trip.status || 'draft',
        created_at: Date.now(),
        updated_at: Date.now()
    };
    trips.push(newTrip);
    localStorage.setItem(key, JSON.stringify(trips));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:db-update'));
    return newTrip.id;
};

const updateLocalTrip = (userId: string, tripId: string, trip: TripItinerary) => {
    const key = getTripsKey(userId);
    const trips = JSON.parse(localStorage.getItem(key) || '[]');
    const index = trips.findIndex((t: StoredTrip) => t.id === tripId); // ID is globally unique

    console.log("📦 [dbService.updateLocalTrip] TripID:", tripId.slice(0, 8), "Found at index:", index, "Status:", trip.status);

    if (index !== -1) {
        trips[index].data = trip;
        trips[index].destination = trip.destination;
        trips[index].total_cost = trip.totalEstimatedCost;
        trips[index].duration = trip.duration;
        trips[index].startDate = trip.startDate;
        trips[index].status = trip.status || trips[index].status;
        trips[index].updated_at = Date.now();
        console.log("📦 [dbService.updateLocalTrip] UPDATED existing entry. New status:", trips[index].status);
    } else {
        // Upsert: If correct ID isn't found locally (e.g. wiped), restore/create it
        const newTrip: StoredTrip = {
            id: tripId,
            user_id: userId,
            destination: trip.destination,
            total_cost: trip.totalEstimatedCost,
            duration: trip.duration,
            data: trip,
            status: trip.status || 'draft',
            startDate: trip.startDate, // Include startDate at top level
            created_at: Date.now(),
            updated_at: Date.now()
        };
        trips.push(newTrip);
        console.log("📦 [dbService.updateLocalTrip] CREATED new entry with startDate:", newTrip.startDate);
    }
    localStorage.setItem(key, JSON.stringify(trips));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:db-update'));
    console.log("📦 [dbService.updateLocalTrip] LocalStorage WRITTEN. Total trips:", trips.length);
};

// Helper for optimistic updates
const updateLocalTripStatus = (userId: string, tripId: string, status: 'draft' | 'confirmed' | 'paused' | 'completed' | 'cancelled') => {
    if (typeof localStorage === 'undefined') return;
    const key = getTripsKey(userId);
    const trips = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = trips.map((t: any) => t.id === tripId ? { ...t, status, updated_at: Date.now() } : t);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event('voyageur:db-update'));
};

const saveLocalPrompt = (userId: string, promptData: Omit<StoredPrompt, 'id' | 'created_at'>): string => {
    const key = getPromptsKey(userId);
    const prompts = JSON.parse(localStorage.getItem(key) || '[]');
    const newPrompt: StoredPrompt = {
        id: crypto.randomUUID(),
        ...promptData,
        created_at: Date.now()
    };
    prompts.push(newPrompt);
    localStorage.setItem(key, JSON.stringify(prompts));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:db-update'));
    return newPrompt.id;
};

const updateLocalPrompt = (userId: string, promptId: string, updates: Partial<StoredPrompt>) => {
    const key = getPromptsKey(userId);
    const prompts = JSON.parse(localStorage.getItem(key) || '[]');
    const index = prompts.findIndex((p: StoredPrompt) => p.id === promptId);
    if (index !== -1) {
        prompts[index] = { ...prompts[index], ...updates };
        localStorage.setItem(key, JSON.stringify(prompts));
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:db-update'));
    }
};

export const dbService = {

    // --- TRIPS ---

    async saveTrip(userId: string, trip: TripItinerary, status: 'draft' | 'confirmed' | 'completed' = 'draft', id?: string, allowRegression: boolean = false): Promise<string> {
        const tripId = id || crypto.randomUUID();
        const timestamp = new Date().toISOString();
        let finalStatus = status;

        // LATCH LOGIC: If existing ranking > new ranking, keep existing (prevent regression)
        // UNLESS allowRegression is explicitly true (e.g. User clicked "Book" to restart/re-confirm)
        // 'cancelled' and 'completed' are terminal and should never be overwritten by 'confirmed' or 'draft'
        const statusRank = { 'draft': 0, 'paused': 1, 'confirmed': 2, 'completed': 3, 'cancelled': 3 };

        if (typeof localStorage !== 'undefined') {
            const key = getTripsKey(userId);
            const trips = JSON.parse(localStorage.getItem(key) || '[]');
            const existingIndex = trips.findIndex((t: StoredTrip) => t.id === tripId);

            if (existingIndex !== -1 && !allowRegression) {
                const currentStatus = trips[existingIndex].status || 'draft';
                const currentRank = statusRank[currentStatus as keyof typeof statusRank] || 0;
                const newRank = statusRank[status as keyof typeof statusRank] || 0;

                if (currentRank > newRank) {
                    console.log(`🔒 [saveTrip] Latch active: Preventing status regression from ${currentStatus} to ${status}`);
                    finalStatus = currentStatus as any;
                }
            }

            const newLocalTrip: StoredTrip = {
                id: tripId,
                user_id: userId,
                destination: trip.destination,
                total_cost: trip.totalEstimatedCost,
                duration: trip.duration,
                data: trip,
                status: finalStatus,
                created_at: existingIndex !== -1 ? trips[existingIndex].created_at : Date.now()
            };

            if (existingIndex !== -1) {
                trips[existingIndex] = newLocalTrip;
            } else {
                trips.push(newLocalTrip);
            }
            localStorage.setItem(key, JSON.stringify(trips));
            if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:db-update'));
        }

        if (supabase) {
            // Note: We use finalStatus here too, trusting the local check or input status
            const { data, error } = await supabase.from('trips').upsert({
                id: tripId,
                user_id: userId,
                destination: trip.destination,
                total_cost: trip.totalEstimatedCost,
                duration: trip.duration,
                data: trip, // JSONB
                status: finalStatus,
                created_at: timestamp,
                mission_code: id ? undefined : crypto.randomUUID().split('-')[0].toUpperCase() // Generate initial code if new
            }).select().single();

            if (error) {
                console.warn("Supabase Save Error (Local saved as backup):", error.message);
                return tripId;
            }
            return data?.id || tripId;
        } else {
            return tripId;
        }
    },

    async leaveSquad(userId: string, tripId: string): Promise<boolean> {
        if (typeof localStorage !== 'undefined') {
            const key = getTripsKey(userId);
            const trips = JSON.parse(localStorage.getItem(key) || '[]');
            const updated = trips.filter((t: any) => t.id !== tripId);
            localStorage.setItem(key, JSON.stringify(updated));
            // Mark as recently deleted to prevent re-appearance during replication lag
            markAsDeleted(tripId, userId);
        }

        if (!supabase) return true; // Offline success

        try {
            const { error } = await supabase
                .from('squad_members')
                .delete()
                .eq('trip_id', tripId)
                .eq('user_id', userId);

            if (error) {
                console.error("❌ [dbService] Failed to leave squad:", error);
                return false;
            }

            // Mark as recently deleted to prevent re-appearance during replication lag
            // Mark as recently deleted to prevent re-appearance during replication lag
            markAsDeleted(tripId, userId);

            // Dispatch update AFTER successful delete to ensure fetchData hits updated DB
            window.dispatchEvent(new Event('voyageur:db-update'));
            return true;
        } catch (err) {
            console.error("❌ [dbService] Error leaving squad:", err);
            return false;
        }
    },

    async kickMember(tripId: string, userId: string): Promise<boolean> {
        if (!supabase) return false;

        console.log(`[dbService] Attempting to kick: tripId=${tripId}, userId=${userId}`);

        try {
            const { data, error, count } = await supabase
                .from('squad_members')
                .delete()
                .eq('trip_id', tripId)
                .eq('user_id', userId)
                .select(); // Return deleted rows to verify

            console.log(`[dbService] Kick result:`, { data, error, count });

            if (error) {
                console.error("❌ [dbService] Failed to kick member:", error);
                return false;
            }

            if (!data || data.length === 0) {
                console.warn("⚠️ [dbService] No rows deleted - member may not exist or RLS blocked");
            }

            return true;
        } catch (err) {
            console.error("❌ [dbService] Error kicking member:", err);
            return false;
        }
    },

    async promoteMember(tripId: string, userId: string, newRole: 'Vanguard' | 'Captain' | 'Specialist'): Promise<boolean> {
        if (!supabase) return false;

        try {
            const { error } = await supabase
                .from('squad_members')
                .update({ role: newRole })
                .eq('trip_id', tripId)
                .eq('user_id', userId);

            if (error) {
                console.error("❌ [dbService] Failed to promote member:", error);
                return false;
            }
            return true;
        } catch (err) {
            console.error("❌ [dbService] Error promoting member:", err);
            return false;
        }
    },

    async getTripById(userId: string, tripId: string): Promise<StoredTrip | null> {
        if (supabase) {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .maybeSingle();

            if (error || !data) return null;
            return {
                ...data,
                startDate: data.startDate || data.data?.startDate,
                status: data.status || 'draft',
                data: { ...data.data, status: data.status || 'draft' },
                created_at: new Date(data.created_at).getTime()
            };
        }
        return null;
    },

    async updateTrip(userId: string, tripId: string, trip: TripItinerary): Promise<void> {
        // Optimistic Local Update
        updateLocalTrip(userId, tripId, trip);

        if (supabase) {
            const { error } = await supabase
                .from('trips')
                .update({
                    destination: trip.destination,
                    total_cost: trip.totalEstimatedCost,
                    duration: trip.duration,
                    data: trip
                })
                .eq('id', tripId);

            if (error) {
                console.warn("Supabase Update Error (Local update already applied):", error.message);
            }
        }
    },

    async syncJoinedTrip(userId: string, trip: StoredTrip, promptId?: string): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        const key = getTripsKey(userId);
        const trips = JSON.parse(localStorage.getItem(key) || '[]');
        const joinedTrip = {
            ...trip,
            status: trip.status || 'draft',
            promptId: promptId || trip.promptId || trip.data?.promptId,
            is_joined: true,
            data: { ...trip.data, is_joined: true, status: trip.status || 'draft' }, // Robust persistence
            updated_at: Date.now()
        };

        const index = trips.findIndex((t: any) => t.id === trip.id);
        if (index !== -1) {
            trips[index] = joinedTrip;
        } else {
            trips.push(joinedTrip);
        }

        localStorage.setItem(key, JSON.stringify(trips));

        // CRITICAL: Un-mark as deleted if it was previously in the deletion cache
        // This ensures immediate visibility if a join follows a previous leave/delete
        try {
            const raw = localStorage.getItem(DELETED_KEY);
            if (raw) {
                const deleted = JSON.parse(raw);
                if (deleted[trip.id]) {
                    delete deleted[trip.id];
                    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
                    console.log(`✨ [dbService] Un-marked trip ${trip.id} as deleted (Instant visibility restored).`);
                }
            }
        } catch (e) {
            console.error("Failed to un-mark trip as deleted:", e);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('voyageur:db-update'));
            window.dispatchEvent(new Event('voyageur:trip-update'));
        }
    },

    async getTrips(userId: string): Promise<StoredTrip[]> {
        if (supabase) {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Supabase Fetch Error (Falling back to Local Storage):", error.message);
                if (typeof localStorage !== 'undefined') {
                    const key = getTripsKey(userId);
                    const trips = JSON.parse(localStorage.getItem(key) || '[]');
                    // Fix: Include joined missions in fallback too
                    const localTrips = trips.filter((t: StoredTrip) => t.user_id === userId || (t as any).is_joined);
                    return localTrips.map((t: StoredTrip) => ({
                        ...t,
                        status: t.status || 'draft',
                        data: { ...t.data, status: t.status || 'draft' }
                    }));
                }
                return [];
            }
            // 1. Process Remote Data
            const remoteTrips = (data || []).map((d: any) => ({
                ...d,
                startDate: d.startDate || d.data?.startDate,
                promptId: d.data?.promptId, // Hoist promptId for unified filtering
                originalPrompt: d.data?.originalPrompt, // Hoist for easy log display
                status: d.status || 'draft',
                is_joined: d.user_id !== userId, // Mark as joined if I don't own it
                data: { ...d.data, status: d.status || 'draft' }, // Force sync
                created_at: new Date(d.created_at).getTime()
            })).filter((t: any) => !(t.status === 'cancelled' && t.is_joined)); // Drop cancelled guest trips

            // 2. Process Local Data (The Authority on Recent Changes)
            // If a trip exists locally, we trust IT over the server (which might be lagging).
            let localTrips: StoredTrip[] = [];
            if (typeof localStorage !== 'undefined') {
                const key = getTripsKey(userId);
                const stored = JSON.parse(localStorage.getItem(key) || '[]');
                // Inclusion: My trips OR trips where I am marked as a member (e.g. via fetch)
                localTrips = stored.filter((t: StoredTrip) => t.user_id === userId || (t as any).is_joined)
                    // Drop cancelled guest trips from local cache to prevent zombie respawns
                    .filter((t: any) => !(t.status === 'cancelled' && t.is_joined))
                    .map((t: any) => ({
                        ...t,
                        startDate: t.startDate || t.data?.startDate,
                        promptId: t.promptId || t.data?.promptId,
                        originalPrompt: t.originalPrompt || t.data?.originalPrompt, // Hoist for local too
                        status: t.status || 'draft',
                        data: { ...t.data, status: t.status || 'draft' } // Force sync
                    }));
            }

            // 3. Smart Merge: Local Wins Conflict, but Server is Source of Truth for Deletions
            const mergedMap = new Map();

            // Populate with Remote
            remoteTrips.forEach((t: any) => mergedMap.set(t.id, t));

            // Merge Local
            const idsToPrune: string[] = [];
            localTrips.forEach(t => {
                const remoteT: any = mergedMap.get(t.id);
                if (remoteT) {
                    if (remoteT.status === 'cancelled' && remoteT.is_joined) {
                        mergedMap.delete(t.id); // Drop it entirely
                    } else if (remoteT.status === 'completed' && remoteT.is_joined) {
                        // Copy server's completed status over the local confirmed status
                        mergedMap.set(t.id, { ...t, status: 'completed', data: { ...t.data, status: 'completed' } });
                    } else {
                        mergedMap.set(t.id, t);
                    }
                } else {
                    const isUUID = t.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

                    // Deletion Logic (Simplified & Authoritative):
                    // 1. If it has a UUID (Persisted) and is missing on server -> PRUNE.
                    //    The server is the authority for all persisted trips (owned OR joined).
                    //    ANTI-GLITCH: We add a 2-minute grace period for local-only persistent trips
                    //    to prevent deletion during replication lag or initial confirmation sync.
                    // 2. If it has no UUID -> PRESERVE. It is a new local-only draft.

                    if (isUUID) {
                        const GRACE_PERIOD = 60 * 1000; // Increased to 60s
                        const lastChanged = t.updated_at || t.created_at || 0;
                        const age = Date.now() - lastChanged;

                        // ANTI-PRUNE FOR JOINED TRIPS: If recently joined, ignore server absence
                        const recentlyJoined = (t as any).is_joined && age < GRACE_PERIOD;

                        if (age > GRACE_PERIOD && !recentlyJoined) {
                            idsToPrune.push(t.id);
                        } else {
                            mergedMap.set(t.id, t);
                        }
                    } else {
                        mergedMap.set(t.id, t);
                    }
                }
            });

            // Perform pruning if needed
            if (idsToPrune.length > 0 && typeof localStorage !== 'undefined') {
                const key = getTripsKey(userId);
                const stored = JSON.parse(localStorage.getItem(key) || '[]');
                const filtered = stored.filter((st: any) => !idsToPrune.includes(st.id));
                localStorage.setItem(key, JSON.stringify(filtered));
            }

            // Final Authority Check: Remove anything recently deleted (lag protection)
            const recentDeletions = getRecentDeletions();
            const authoritative = Array.from(mergedMap.values())
                .filter((t: any) => !recentDeletions.has(t.id));

            // Convert and Sort
            return authoritative.sort((a: any, b: any) => b.created_at - a.created_at);
        } else if (typeof localStorage !== 'undefined') {
            const key = getTripsKey(userId);
            const trips = JSON.parse(localStorage.getItem(key) || '[]');
            const localTrips = trips.filter((t: StoredTrip) => t.user_id === userId || (t as any).is_joined);
            return localTrips.map((t: StoredTrip) => ({
                ...t,
                status: t.status || 'draft',
                data: { ...t.data, status: t.status || 'draft' } // Force sync
            }));
        }
        return [];
    },

    async deleteTrip(userId: string, tripId: string): Promise<boolean> {
        if (typeof localStorage !== 'undefined') {
            const key = getTripsKey(userId);
            const trips = JSON.parse(localStorage.getItem(key) || '[]');
            const updated = trips.filter((t: any) => t.id !== tripId);
            localStorage.setItem(key, JSON.stringify(updated));
        }

        if (supabase) {
            try {
                // 1. Try to delete as owner
                const { error: tripError } = await supabase.from('trips').delete().eq('id', tripId).eq('user_id', userId);
                // 2. Also try to delete from squad_members (Leave)
                const { error: memberError } = await supabase.from('squad_members').delete().eq('trip_id', tripId).eq('user_id', userId);

                if (tripError || memberError) {
                    console.error("❌ [dbService] Delete Trip failed:", tripError || memberError);
                    return false;
                }

                // Mark as recently deleted to prevent re-appearance
                // Mark as recently deleted to prevent re-appearance
                markAsDeleted(tripId, userId);

                // Dispatch update AFTER successful delete
                window.dispatchEvent(new Event('voyageur:db-update'));
                return true;
            } catch (err) {
                console.error("❌ [dbService] Error in deleteTrip:", err);
                return false;
            }
        }
        return true;
    },

    async updateTripStatus(userId: string, tripId: string, status: 'draft' | 'confirmed' | 'paused' | 'completed' | 'cancelled'): Promise<void> {
        // Optimistic Local Update
        updateLocalTripStatus(userId, tripId, status);

        if (supabase) {
            const { error } = await supabase
                .from('trips')
                .update({ status: status })
                .eq('id', tripId);

            if (error) {
                console.warn("Supabase Status Update Error (Local update already applied):", error.message);
            }
        }
    },

    async generateMissionCode(tripId: string): Promise<string | null> {
        if (!supabase) return null;
        const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { error } = await supabase
            .from('trips')
            .update({ mission_code: newCode })
            .eq('id', tripId);

        if (error) {
            console.error("SquadSync: Failed to generate code", error);
            return null;
        }
        return newCode;
    },

    async joinSquad(userId: string, inviteCode: string): Promise<string | null> {
        if (!supabase) return null;

        console.log(`[dbService] Joining squad: code=${inviteCode}, userId=${userId}`);

        // Use the secure RPC to join the squad
        // This bypasses RLS for finding the trip_id by mission_code
        const { data: tripId, error } = await supabase
            .rpc('join_squad_by_code', {
                target_user_id: userId,
                invite_code: inviteCode.toUpperCase()
            });

        if (error || !tripId) {
            console.warn("SquadSync: Join failed via RPC", error?.message || "Invalid Code");
            return null;
        }

        console.log(`[dbService] Join Success! tripId=${tripId}`);
        return tripId;
    },

    // --- PROMPTS ---

    async savePrompt(userId: string, promptText: string): Promise<void> {
        // Delegate to savePromptWithStatus to ensure centralized deduplication logic
        this.savePromptWithStatus({
            user_id: userId,
            prompt: promptText,
            status: 'ready'
        });
    },

    // Save prompt with status for background generation
    // Save prompt with status for background generation (Upsert + Status Latch)
    savePromptWithStatus(promptData: Omit<StoredPrompt, 'id' | 'created_at'> & { id?: string, allowRegression?: boolean }): string {
        let id = promptData.id || crypto.randomUUID();
        let created_at = Date.now();
        let isUpdate = false;
        let finalStatus = promptData.status;

        // 1. Optimistic Local Upsert
        if (typeof localStorage !== 'undefined') {
            const key = getPromptsKey(promptData.user_id);
            const prompts: StoredPrompt[] = JSON.parse(localStorage.getItem(key) || '[]');

            // Deduplication: Check ID first, then Text
            const existingIndex = prompts.findIndex(p =>
                (promptData.id && p.id === promptData.id) ||
                (p.prompt.trim().toLowerCase() === promptData.prompt.trim().toLowerCase() &&
                    p.user_id === promptData.user_id)
            );

            if (existingIndex !== -1) {
                // Reuse existing ID
                id = prompts[existingIndex].id;
                isUpdate = true;
                // PRESERVE original creation time and prompt text
                created_at = prompts[existingIndex].created_at;
                const originalPromptText = prompts[existingIndex].prompt;

                // Status Latch Logic: "Only go up" (Draft -> Confirmed -> Completed)
                // UNLESS allowRegression is explicitly true
                if (!promptData.allowRegression) {
                    const currentStatus = prompts[existingIndex].status;
                    const statusPriority = { 'failed': 0, 'ready': 1, 'generating': 1, 'draft': 1, 'confirmed': 2, 'completed': 3, 'consumed': 4 };

                    const currentP = statusPriority[currentStatus as keyof typeof statusPriority] || 0;
                    const newP = statusPriority[promptData.status as keyof typeof statusPriority] || 0;

                    if (currentP > newP) {
                        finalStatus = currentStatus;
                    }
                }

                // Update object: Keep original timestamp and prompt text
                prompts[existingIndex] = {
                    ...prompts[existingIndex],
                    ...promptData,
                    prompt: originalPromptText, // DO NOT OVERWRITE ORIGINAL INPUT
                    status: finalStatus,
                    created_at: created_at
                };
            } else {
                // Insert new
                prompts.push({ id, created_at, ...promptData, status: finalStatus });
            }

            localStorage.setItem(key, JSON.stringify(prompts));
            if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:db-update'));
        }

        // 2. Supabase Sync (Async)
        if (supabase) {
            // MAP EXTENDED LOCAL STATUSES TO DB-COMPATIBLE STATUSES
            // DB supports: 'generating', 'ready', 'failed', 'confirmed', 'completed', 'consumed'
            let dbStatus = finalStatus;
            const validDbStatuses = ['generating', 'ready', 'failed', 'confirmed', 'completed', 'consumed'];

            if (!validDbStatuses.includes(finalStatus)) {
                // Map draft -> 'ready' (if implied success) or 'generating'
                if (['draft'].includes(finalStatus)) {
                    dbStatus = 'ready';
                } else {
                    dbStatus = 'ready'; // Fallback
                }
            }

            const payload = {
                id: id as any, // Cast to avoid template literal mismatch
                user_id: promptData.user_id,
                prompt: promptData.prompt,
                destination: promptData.destination || null,
                result: promptData.result || null, // Ensure result is persisted
                status: dbStatus, // Use sanitized status
                created_at: new Date(created_at).toISOString()
            };

            const query = supabase.from('prompts');
            // Use Upsert to handle both cases efficiently
            query.upsert(payload)
                .then(({ error }: any) => {
                    if (error) console.error('Supabase prompt save/upsert error:', error.message);
                    else console.log('✅ Prompt saved/updated in Supabase:', id, isUpdate ? '(Update)' : '(New)');
                });
        }

        return id;
    },

    // Update prompt status/result after background generation
    updatePrompt(userId: string, promptId: string, updates: Partial<StoredPrompt>) {
        // Update localStorage immediately
        if (typeof localStorage !== 'undefined') {
            updateLocalPrompt(userId, promptId, updates);
        }

        // Also update Supabase (async, fire-and-forget)
        if (supabase) {
            const supabaseUpdates: any = { ...updates };

            // Sanitize status for DB
            if (updates.status) {
                const validDbStatuses = ['generating', 'ready', 'failed', 'confirmed', 'completed', 'consumed'];
                if (!validDbStatuses.includes(updates.status)) {
                    if (['draft'].includes(updates.status)) {
                        supabaseUpdates.status = 'ready';
                    } else {
                        supabaseUpdates.status = 'ready';
                    }
                }
            }

            // JSONB columns in Supabase generally accept objects directly
            if (updates.result) {
                supabaseUpdates.result = updates.result;
            }

            console.log('🔄 Attempting Supabase update:', promptId, supabaseUpdates);

            supabase
                .from('prompts')
                .update(supabaseUpdates)
                .eq('id', promptId)
                .select() // Return data to confirm update
                .then(({ data, error }: any) => {
                    if (error) {
                        console.error('❌ Supabase prompt update FAILED:', error.message);
                    } else if (!data || data.length === 0) {
                        console.warn('⚠️ Supabase update succeeded but NO ROWS modified. Check promptId or RLS.', promptId);
                    } else {
                        console.log('✅ Supabase prompt updated successfully:', data[0].status);
                    }
                });
        }
    },

    async getPrompts(userId: string): Promise<StoredPrompt[]> {
        // Get locally deleted IDs (fallback for RLS failures)
        const deletedIds = typeof localStorage !== 'undefined'
            ? JSON.parse(localStorage.getItem('voyageur_deleted_prompts') || '[]')
            : [];

        // Helper: Deduplicate prompts by text (keep latest or most advanced status?)
        // We'll keep the one with the highest priority status or latest timestamp.
        const deduplicateList = (list: StoredPrompt[]) => {
            const map = new Map<string, StoredPrompt>();
            const statusPriority = { 'consumed': 4, 'completed': 3, 'confirmed': 2, 'generating': 1, 'ready': 1, 'draft': 1, 'failed': 0 };

            list.forEach(p => {
                const key = (p.prompt || '').trim().toLowerCase();
                if (!key) return;

                const existing = map.get(key);
                if (!existing) {
                    map.set(key, p);
                } else {
                    // Conflict: Keep better one
                    const existingP = statusPriority[existing.status as keyof typeof statusPriority] || 0;
                    const newP = statusPriority[p.status as keyof typeof statusPriority] || 0;

                    if (newP > existingP) {
                        map.set(key, p); // New one has better status (e.g. Completed vs Draft)
                    } else if (newP === existingP) {
                        if (p.created_at > existing.created_at) {
                            map.set(key, p); // New one is newer
                        }
                    }
                    // Else keep existing
                }
            });
            return Array.from(map.values()).sort((a, b) => b.created_at - a.created_at);
        };

        if (supabase) {
            const { data, error } = await supabase
                .from('prompts')
                .select('*')
                .eq('user_id', userId)
                .neq('status', 'consumed') // Filter out soft-deleted prompts
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Supabase Prompt Fetch Error (Falling back to Local Storage):", error.message);
                if (typeof localStorage !== 'undefined') {
                    const key = getPromptsKey(userId);
                    const raw = JSON.parse(localStorage.getItem(key) || '[]');
                    const filtered = raw.filter((p: StoredPrompt) => p.user_id === userId && !deletedIds.includes(p.id));

                    // Self-Healing: Check for duplicates
                    const deduped = deduplicateList(filtered);
                    if (deduped.length !== filtered.length) {
                        console.log('🧹 [Self-Healing] Cleaned up duplicate prompts');
                        localStorage.setItem(key, JSON.stringify(deduped));
                    }
                    return deduped;
                }
                return [];
            }

            // 1. Process Remote Data
            const remotePrompts = (data || []).map((p: any) => ({
                id: p.id,
                user_id: p.user_id,
                prompt: p.prompt,
                destination: p.destination,
                status: p.status || 'ready',
                result: typeof p.result === 'string' ? JSON.parse(p.result) : p.result,
                error: p.error,
                created_at: new Date(p.created_at).getTime()
            }));

            // 2. Process Local Data (The Authority on Recent Changes)
            let localPrompts: StoredPrompt[] = [];
            if (typeof localStorage !== 'undefined') {
                const key = getPromptsKey(userId);
                const stored = JSON.parse(localStorage.getItem(key) || '[]');
                localPrompts = stored.filter((p: StoredPrompt) => p.user_id === userId);
            }

            // 3. Strict Merge: Local Wins Conflicts
            // This ensures that if we just updated status to 'ready' locally,
            // we display it immediately even if Supabase is still 'generating'.
            const mergedMap = new Map();
            remotePrompts.forEach((p: any) => mergedMap.set(p.id, p));
            localPrompts.forEach((p: StoredPrompt) => mergedMap.set(p.id, p));

            // Filter deleted and Sort
            return Array.from(mergedMap.values())
                .filter((p: any) => !deletedIds.includes(p.id))
                .sort((a: any, b: any) => b.created_at - a.created_at);
        } else if (typeof localStorage !== 'undefined') {
            const key = getPromptsKey(userId);
            const prompts = JSON.parse(localStorage.getItem(key) || '[]');
            return prompts.filter((p: StoredPrompt) => p.user_id === userId && !deletedIds.includes(p.id));
        }
        return [];
    },

    async deletePrompt(userId: string, promptId: string) {
        if (typeof localStorage !== 'undefined') {
            const key = getPromptsKey(userId);
            // 1. Remove from main prompts cache
            const prompts: StoredPrompt[] = JSON.parse(localStorage.getItem(key) || '[]');
            const updated = prompts.filter(p => p.id !== promptId);
            localStorage.setItem(key, JSON.stringify(updated));
            if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:db-update'));

            // 2. Add to deleted IDs list (as a backup)
            const deleted = JSON.parse(localStorage.getItem('voyageur_deleted_prompts') || '[]');
            if (!deleted.includes(promptId)) {
                deleted.push(promptId);
                localStorage.setItem('voyageur_deleted_prompts', JSON.stringify(deleted));
            }
        }

        // Remove from Supabase (Soft Delete first, then Hard Delete)
        if (supabase) {
            // A. Soft Delete (Mark as consumed) - ensuring it hides even if DELETE fails (RLS)
            const { error: softError } = await supabase
                .from('prompts')
                .update({ status: 'consumed' })
                .eq('id', promptId);

            if (softError) console.warn("Soft delete prompt failed:", softError.message);

            // B. Hard Delete (Cleanup)
            await supabase
                .from('prompts')
                .delete()
                .eq('id', promptId);
        }
    },

    // --- STATS AGGREGATION ---
    async getStats(userId: string) {
        const allTrips = await this.getTrips(userId);
        // Count confirmed, paused, and completed for trip count
        const activeTrips = allTrips.filter(t => t.status === 'confirmed' || t.status === 'completed' || t.status === 'paused');
        const completedTrips = allTrips.filter(t => t.status === 'completed');

        // Calculate Total Spend AND Total Completions - FROM ALL TRIPS (Active + Completed)
        // This ensures re-booked trips (which are 'confirmed') still count their PAST completions
        let totalSpend = 0;
        let totalCompletions = 0; // For Voyager Points and Carbon Offset

        allTrips.forEach(t => {
            // Check for completionHistory (re-booked trips or multiple completions)
            const history = (t.data as any)?.completionHistory;

            if (history && Array.isArray(history) && history.length > 0) {
                // Sum all completions in history (ARCHIVED)
                history.forEach((costStr: string) => {
                    const match = costStr?.match?.(/[\d,]+/);
                    if (match) totalSpend += parseFloat(match[0].replace(/,/g, ''));
                });
                // Count historical completions
                totalCompletions += history.length;
            }

            // Add CURRENT trip cost and count ONLY if it is completed (ACTIVE)
            if (t.status === 'completed') {
                const costStr = t.total_cost || (t.data as any)?.totalEstimatedCost || '';
                if (costStr) {
                    const match = costStr.match(/[\d,]+/);
                    if (match) {
                        const cost = parseFloat(match[0].replace(/,/g, ''));
                        if (!isNaN(cost)) totalSpend += cost;
                    }
                }
                totalCompletions += 1;
            }
        });

        // Count unique cities from COMPLETED trips only
        const cities = new Set(
            completedTrips
                .map(t => t.destination?.toLowerCase().trim().split(',')[0].trim())
                .filter(Boolean)
        ).size;

        // --- DNA ANALYSIS ---
        const dnaScores = { Adventure: 0, Luxury: 0, Culture: 0, Relaxation: 0 };
        const keywords = {
            Adventure: ["hike", "hiking", "trek", "camp", "safari", "mountain", "kayak", "ski", "climb", "raft", "scuba", "dive", "explore", "wild", "forest", "jungle"],
            Luxury: ["resort", "spa", "5-star", "five star", "luxury", "gourmet", "yacht", "private", "chauffeur", "limousine", "suite", "fine dining", "champagne", "helicopter"],
            Culture: ["museum", "history", "historical", "temple", "art", "gallery", "culture", "cultural", "heritage", "ancient", "tour", "monument", "palace", "cathedral", "ruins"],
            Relaxation: ["beach", "massage", "relax", "pool", "leisure", "cruise", "island", "sunset", "lounge", "wellness", "yoga", "retreat", "sun"]
        };

        const analyzeText = (text: string, scores: typeof dnaScores, weight: number) => {
            if (!text) return;
            const lower = text.toLowerCase();
            (Object.keys(keywords) as Array<keyof typeof keywords>).forEach(category => {
                if (keywords[category].some(k => lower.includes(k))) {
                    scores[category] += weight;
                }
            });
        };

        // Aggregation for averaging
        const aggregatedDNA = { Adventure: 0, Luxury: 0, Culture: 0, Relaxation: 0 };
        let tripsWithDNA = 0;

        // Analyze ALL trips (Active + Completed)
        allTrips.forEach(t => {
            if (!t.data) return;

            // STRATEGY 2: LLM Tagging (Preferred)
            if (t.data.dna) {
                aggregatedDNA.Adventure += Number(t.data.dna.Adventure) || 0;
                aggregatedDNA.Luxury += Number(t.data.dna.Luxury) || 0;
                aggregatedDNA.Culture += Number(t.data.dna.Culture) || 0;
                aggregatedDNA.Relaxation += Number(t.data.dna.Relaxation) || 0;
                tripsWithDNA++;
                return;
            }

            // STRATEGY 1: Keyword Analysis (Fallback for Legacy Trips)
            const localScores = { Adventure: 0, Luxury: 0, Culture: 0, Relaxation: 0 };

            // 1. Destination (Weight: 2)
            analyzeText(t.destination, localScores, 2);

            // 2. Daily Itinerary (Themes & Activities)
            if (t.data.days) {
                t.data.days.forEach(day => {
                    analyzeText(day.theme, localScores, 2);
                    if (day.activities) {
                        day.activities.forEach(act => {
                            analyzeText(act.title, localScores, 1);
                            analyzeText(act.description, localScores, 1);
                        });
                    }
                });
            }

            // Normalize this single trip's keyword score to percentages (0-100)
            const totalLocal = Object.values(localScores).reduce((a, b) => a + b, 0);
            if (totalLocal > 0) {
                aggregatedDNA.Adventure += Math.round((localScores.Adventure / totalLocal) * 100);
                aggregatedDNA.Luxury += Math.round((localScores.Luxury / totalLocal) * 100);
                aggregatedDNA.Culture += Math.round((localScores.Culture / totalLocal) * 100);
                aggregatedDNA.Relaxation += Math.round((localScores.Relaxation / totalLocal) * 100);
                tripsWithDNA++;
            }
        });

        // Calculate Final Average
        const dna = {
            Adventure: tripsWithDNA ? Math.round(aggregatedDNA.Adventure / tripsWithDNA) : 0,
            Luxury: tripsWithDNA ? Math.round(aggregatedDNA.Luxury / tripsWithDNA) : 0,
            Culture: tripsWithDNA ? Math.round(aggregatedDNA.Culture / tripsWithDNA) : 0,
            Relaxation: tripsWithDNA ? Math.round(aggregatedDNA.Relaxation / tripsWithDNA) : 0
        };

        if (tripsWithDNA === 0 && allTrips.length > 0) {
            dna.Adventure = 25; dna.Luxury = 25; dna.Culture = 25; dna.Relaxation = 25;
        }

        return {
            dna,
            totalSpend: Math.round(totalSpend),
            tripCount: activeTrips.length,
            totalCompletions: totalCompletions, // For Voyager Points and Carbon Offset (includes re-booked trips)
            citiesVisited: cities,
            recentTrips: activeTrips // Remove .slice(0, 4) to allow full history
        };
    },

    // --- CREDIT SYSTEM (RPCs) ---

    // Get latest credits (Remote Authority)
    async getUserCredits(userId: string): Promise<number> {
        if (!supabase) return 0;
        const { data, error } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();

        if (error) {
            console.error("Error fetching credits:", error);
            return 0;
        }
        return data?.credits || 0;
    },

    // Atomic Add (Via RPC)
    async addCreditsRPC(userId: string, amount: number): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase.rpc('add_credits', {
            target_user_id: userId,
            amount: amount
        });
        if (error) handleRpcError(error, 'add credits');
    },

    // Atomic Deduct (Via RPC)
    async deductCreditsRPC(userId: string, amount: number): Promise<boolean> {
        if (!supabase) return false;
        const { data, error } = await supabase.rpc('deduct_credits', {
            target_user_id: userId,
            amount: amount
        });

        if (error) {
            console.error("Error deducting credits:", error);
            return false;
        }
        return data as boolean;
    },

    // Record Payment & Idempotency Check (Via RPC)
    async recordPaymentRPC(
        userId: string,
        provider: string,
        paymentId: string,
        amount: number,
        credits: number,
        status: string
    ): Promise<boolean> {
        if (!supabase) return false;
        const { data, error } = await supabase.rpc('record_payment', {
            p_user_id: userId,
            p_provider: provider,
            p_payment_id: paymentId,
            p_amount: amount,
            p_credits: credits,
            p_status: status
        });

        if (error) {
            console.error("Error recording payment:", error);
            return false; // Might be duplicate
        }
        return data as boolean;
    },

    // Get Payment History for a user
    async getPaymentHistory(userId: string): Promise<{
        id: string;
        credits_added: number;
        amount: number;
        status: string;
        created_at: string;
        provider: string;
    }[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('payments')
            .select('id, credits_added, amount, status, created_at, provider')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error("Error fetching payment history:", error);
            return [];
        }
        return data || [];
    },

    // Save User Settings to Supabase
    async saveUserSettings(userId: string, settings: { dietary?: string; luxury?: number; darkMode?: boolean }): Promise<boolean> {
        if (!supabase) return false;

        try {
            const { error } = await supabase.rpc('upsert_user_settings', {
                p_user_id: userId,
                p_dietary: settings.dietary,
                p_luxury: settings.luxury,
                p_dark_mode: settings.darkMode
            });

            if (error) {
                console.error("Error saving user settings:", error);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Exception saving user settings:", e);
            return false;
        }
    },

    // Load User Settings from Supabase
    async loadUserSettings(userId: string): Promise<{ dietary: string; luxury: number; darkMode: boolean } | null> {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase.rpc('get_user_settings', {
                p_user_id: userId
            });

            if (error) {
                console.error("Error loading user settings:", error);
                return null;
            }

            if (data && data.length > 0) {
                return {
                    dietary: data[0].dietary || 'None',
                    luxury: data[0].luxury || 3,
                    darkMode: data[0].dark_mode ?? true
                };
            }
            return null;
        } catch (e) {
            console.error("Exception loading user settings:", e);
            return null;
        }
    },

    // Update user's display name in profiles table AND Supabase Auth Metadata
    async updateUserName(userId: string, newName: string): Promise<boolean> {
        if (!supabase) return false;

        try {
            // 1. Update Public Profile (Source of Truth for App)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: newName })
                .eq('id', userId);

            if (profileError) {
                console.error("Error updating user profile:", profileError);
                return false;
            }

            // 2. Update Auth Metadata (Source of Truth for Session/Initial Load)
            // This prevents the "old name flicker" on fresh logins/cleared cache.
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: newName }
            });

            if (authError) {
                console.warn("Warning: Failed to sync auth metadata (non-critical):", authError);
                // We return true because the main profile update succeeded.
            }

            return true;
        } catch (e) {
            console.error("Exception updating user name:", e);
            return false;
        }
    },

    // Get Full User Profile (Credits + Name + etc) - Source of Truth
    async getUserProfile(userId: string, metadata?: { full_name?: string; avatar_url?: string }): Promise<{ fullName: string; credits: number; avatar_url?: string } | null> {
        if (!supabase) return null;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, credits, avatar_url')
                .eq('id', userId)
                .maybeSingle(); // Use maybeSingle to handle deleted profiles gracefully

            if (error) {
                console.error("Error fetching user profile:", error);
                return null;
            }

            // Self-Healing: If profile is missing (deleted but Auth exists), recreate it
            if (!data) {
                const initialName = metadata?.full_name || 'Traveler';
                const initialAvatar = metadata?.avatar_url || '';

                // Attempt recovery but fail gracefully
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        full_name: initialName,
                        credits: 0,
                        avatar_url: initialAvatar
                    });

                if (insertError) {
                    // Use warn, not error, and return default anyway to unblock UI
                    console.warn("Auto-creation of profile failed (using temporary):", insertError.message);
                    return { fullName: initialName, credits: 0, avatar_url: initialAvatar };
                }
                return { fullName: initialName, credits: 0, avatar_url: initialAvatar };
            }

            // SYNC CHECK: If profile is missing avatar but auth has one, update it
            if (metadata?.avatar_url && !data.avatar_url) {
                console.log("🔄 [dbService] Syncing missing avatar from Auth Metadata...");
                supabase.from('profiles')
                    .update({ avatar_url: metadata.avatar_url })
                    .eq('id', userId)
                    .then(({ error }) => {
                        if (error) console.warn("Failed to sync avatar:", error);
                    });
                // Return eagerly
                return {
                    fullName: data.full_name || '',
                    credits: data.credits || 0,
                    avatar_url: metadata.avatar_url
                };
            }

            return {
                fullName: data.full_name || '',
                credits: data.credits || 0,
                avatar_url: data.avatar_url || ''
            };
        } catch (e) {
            console.error("Exception fetching user profile:", e);
            return null;
        }
    }
};
