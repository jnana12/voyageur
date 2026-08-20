import { supabase } from './supabaseClient';

export interface PresencePayload {
    user_id: string;
    trip_id: string;
    lat?: number;
    lng?: number;
    battery_level?: number;
    last_seen?: string;
    is_online?: boolean; // Explicit status
}

class PresenceService {
    private watchId: number | null = null;
    private timerId: any = null;
    private userId: string | null = null;
    private tripId: string | null = null;
    private lastUpdate = 0;
    private readonly UPDATE_THRESHOLD = 5000; // 5 seconds
    private readonly HEARTBEAT_INTERVAL = 15000; // Accelerated heartbeat (15s)
    private failCount23503 = 0;
    private lastPayload: string = '';

    // State
    private currentLat: number = 0;
    private currentLng: number = 0;

    async startTracking(userId: string, tripId: string) {
        this.stopTracking(); // Ensure clean state

        this.userId = userId;
        this.tripId = tripId;

        console.log("PresenceService: Starting Tracking for", userId);

        // 1. Start Geolocation (if available)
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            this.watchId = navigator.geolocation.watchPosition(
                (pos) => this.handlePositionUpdate(pos),
                (err) => {
                    console.warn(`Presence Geo Error (${err.code}): ${err.message}`);
                    // We don't stop here, the heartbeat will handle connection
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 30000,
                    timeout: 27000
                }
            );
        }

        // 2. Start PERMANENT Heartbeat (Keep-Alive)
        // This ensures 'last_seen' is updated even if user is stationary or GPS blocked
        this.sendHeartbeat(true); // Immediate pulse (Online)
        this.timerId = setInterval(() => {
            this.sendHeartbeat(true);
        }, this.HEARTBEAT_INTERVAL);

        // 3. Listen for logout
        window.addEventListener('voyageur:auth-change', (e: any) => {
            if (!e.detail?.isLoggedIn) {
                console.log("PresenceService: Auth-change detected (Logout). Stopping tracking.");
                this.stopTracking();
            }
        });
    }

    async stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        // Send a final "offline" heartbeat if we have the credentials
        if (this.userId && this.tripId && supabase) {
            try {
                const payload: PresencePayload = {
                    user_id: this.userId,
                    trip_id: this.tripId,
                    lat: this.currentLat,
                    lng: this.currentLng,
                    last_seen: new Date().toISOString(),
                    is_online: false // Explicit OFFLINE
                };
                console.log("PresenceService: Sending OFFLINE signal for", this.userId);
                // Fire and forget, but use await to try to ensure it sends before page unload
                await supabase.from('tactical_presence').upsert(payload, { onConflict: 'user_id' });
            } catch (e) {
                // Silently fail on stop
            }
        }

        this.userId = null;
        this.tripId = null;
    }

    // Called by Interval (Keep-Alive)
    private async sendHeartbeat(isOnline: boolean = true) {
        if (!this.userId || !this.tripId || !supabase) return;

        const battery = await this.getBatteryLevel();
        const payload: PresencePayload = {
            user_id: this.userId,
            trip_id: this.tripId,
            lat: this.currentLat, // Send last known
            lng: this.currentLng, // Send last known
            battery_level: battery,
            last_seen: new Date().toISOString(),
            is_online: isOnline
        };

        // Suppressed logs for heartbeat to avoid clutter, unless error
        this.upsertPresence(payload, false);
    }

    // Called by GPS (Location Change)
    private async handlePositionUpdate(position: GeolocationPosition) {
        // Update local state
        this.currentLat = position.coords.latitude;
        this.currentLng = position.coords.longitude;

        const now = Date.now();
        // Throttle rapid GPS updates
        if (now - this.lastUpdate < this.UPDATE_THRESHOLD) return;
        this.lastUpdate = now;

        const battery = await this.getBatteryLevel();

        if (!this.userId || !this.tripId || !supabase) return;

        const payload: PresencePayload = {
            user_id: this.userId,
            trip_id: this.tripId,
            lat: this.currentLat,
            lng: this.currentLng,
            battery_level: battery,
            last_seen: new Date().toISOString(),
            is_online: true
        };

        this.upsertPresence(payload, true);
    }

    // Debug State
    public lastSyncStatus: string = 'Initializing...';
    public lastSyncTime: string = '-';

    private async upsertPresence(payload: PresencePayload, log: boolean) {
        if (!this.tripId || !this.userId) return;

        // Validation to prevent DB errors
        if (payload.lat === undefined || payload.lng === undefined || isNaN(payload.lat) || isNaN(payload.lng)) {
            if (log) console.warn("Presence Service: Skipping sync due to invalid coords", payload);
            return;
        }

        try {
            const { error } = await supabase
                .from('tactical_presence')
                .upsert(payload, { onConflict: 'user_id' });

            if (error) {
                // FK Violation: Trip ID not found in trips table
                if (error.code === '23503') {
                    this.failCount23503++;
                    if (log) console.warn(`Presence Service: [23503] Trip ID not yet on server (Fail count: ${this.failCount23503}/10).`);

                    if (this.failCount23503 >= 10) {
                        console.error("Presence Service: Permanent FK failure. Stopping tracking to prevent spam.");
                        this.stopTracking();
                    }

                    this.lastSyncStatus = 'Waiting for Server...';
                    this.lastSyncTime = new Date().toLocaleTimeString();
                    return;
                }

                // Reset fail count on other errors/success
                this.failCount23503 = 0;

                // Conflict: 23505 is the PG code for Unique Violation which results in HTTP 409
                if (error.code === '23505' || (error as any).status === 409) {
                    if (log) console.error("Presence Service: [409/23505] Conflict detected! This means the database table 'tactical_presence' DOES NOT have user_id as its sole Primary Key. Please run the nuclear_presence_fix.sql script.");
                    this.lastSyncStatus = 'Conflict (Database Schema Mismatch)';
                    return;
                }

                console.error("Presence Upsert Error telemetry:", {
                    code: error.code,
                    status: (error as any).status,
                    message: error.message,
                    hint: error.hint,
                    payload: payload
                });
                this.lastSyncStatus = `Error: ${error.message}`;
                this.lastSyncTime = new Date().toLocaleTimeString();
            } else {
                if (log) console.log("Presence: Location Sync Success");
                this.lastSyncStatus = 'Success';
                this.lastSyncTime = new Date().toLocaleTimeString();
            }
        } catch (err: any) {
            console.error("Failed to sync presence:", err);
            this.lastSyncStatus = `Exception: ${err.message}`;
            this.lastSyncTime = new Date().toLocaleTimeString();
        }
    }

    private async getBatteryLevel(): Promise<number | undefined> {
        try {
            if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
                const battery: any = await (navigator as any).getBattery();
                return Math.floor(battery.level * 100);
            }
        } catch (e) {
            // Ignore battery errors
        }
        return undefined;
    }
}

export const presenceService = new PresenceService();
