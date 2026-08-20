/**
 * GOOGLE CALENDAR SERVICE
 * Handles OAuth authentication and calendar event creation for trips
 */

// Storage keys
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'voyageur_gcal_access_token',
    TOKEN_EXPIRY: 'voyageur_gcal_token_expiry',
    CONNECTED: 'voyageur_gcal_connected'
};

// Google API Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Type definitions
interface TripData {
    id?: string;
    destination: string;
    duration: string;
    startDate?: string;
    data?: {
        summary?: string;
        startDate?: string;
        days?: any[]; // Detailed itinerary
        calendarEventIds?: string[]; // Stored IDs for deletion
    };
}

// ... (existing code)

/**
 * Delete a list of events
 */
export const deleteTripEvents = async (
    eventIds: string[],
    onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Use auto-refreshing token getter
        const accessToken = await getValidAccessToken();
        if (!accessToken) return { success: false, error: 'Not connected. Please reconnect.' };

        // Ensure gapi loaded
        const initSuccess = await initGoogleCalendar();
        if (!initSuccess) {
            return { success: false, error: 'Initialization timed out.' };
        }
        (window as any).gapi.client.setToken({ access_token: accessToken });


        // Ensure API loaded check
        if (!(window as any).gapi.client.calendar) {
            await (window as any).gapi.client.load('calendar', 'v3');
        }

        let deletedCount = 0;
        const total = eventIds.length;

        onProgress?.(0, total);

        for (const id of eventIds) {
            try {
                await (window as any).gapi.client.calendar.events.delete({
                    calendarId: 'primary',
                    eventId: id
                });
                deletedCount++;
            } catch (err: any) {
                // Handle "Already Deleted" cases (410 Gone, 404 Not Found) as success
                // This ensures local state cleans up even if remote is already gone
                const code = err.status || err.result?.error?.code;
                if (code === 410 || code === 404) {
                    console.log(`ℹ️ [GoogleCalendar] Event ${id} already deleted (${code}). Skipping.`);
                    deletedCount++;
                } else {
                    console.warn(`⚠️ [GoogleCalendar] Failed to delete event ${id}`, err);
                }
            }
            onProgress?.(deletedCount, total);
            // Rate limit niceness
            await new Promise(r => setTimeout(r, 150));
        }

        console.log(`✅ [GoogleCalendar] Deleted ${deletedCount}/${eventIds.length} events.`);
        return { success: true };
    } catch (error: any) {
        console.error('❌ [GoogleCalendar] Delete failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Create a calendar event for a trip
 */
export const createTripEvent = async (
    trip: TripData,
    onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; eventIds?: string[]; error?: string }> => {
    try {
        // Use the auto-refreshing token getter
        let accessToken = await getValidAccessToken();

        // Auto-connect if not connected
        if (!accessToken) {
            console.log('📅 [GoogleCalendar] Not connected, triggering auto-connect...');
            try {
                const connected = await connectCalendar();
                if (connected) {
                    accessToken = await getValidAccessToken();
                }
            } catch (connectError) {
                console.error('❌ [GoogleCalendar] Auto-connect failed:', connectError);
                return { success: false, error: 'Failed to connect to Google Calendar. Please try again.' };
            }
        }

        if (!accessToken) {
            return { success: false, error: 'Calendar connection cancelled or failed.' };
        }

        const startDate = trip.startDate || trip.data?.startDate;
        if (!startDate) {
            return { success: false, error: 'Trip has no start date' };
        }

        // Ensure scripts loaded
        const initSuccess = await initGoogleCalendar();
        if (!initSuccess) {
            return { success: false, error: 'Initialization timed out.' };
        }
        (window as any).gapi.client.setToken({ access_token: accessToken });

        // Ensure API loaded
        if (!(window as any).gapi.client.calendar) {
            await (window as any).gapi.client.load('calendar', 'v3');
        }

        const createdEventIds: string[] = [];
        let totalEvents = 1; // Start with 1 for main event

        // Count total activities for progress
        if (trip.data?.days) {
            trip.data.days.forEach(d => {
                if (d.activities) totalEvents += d.activities.length;
            });
        }

        // 1. Create Main Trip Block
        onProgress?.(0, totalEvents);

        const endDate = calculateEndDate(startDate, trip.duration || '1 day');
        const mainEvent: CalendarEvent = {
            summary: `✈️ Trip to ${trip.destination} (Voyageur)`,
            description: `${trip.data?.summary || `Your Voyageur trip to ${trip.destination}`}\n\nDuration: ${trip.duration}\n\nManaged by Voyageur AI`,
            start: { date: startDate },
            end: { date: endDate },
            colorId: '9',
        };

        const mainResponse = await (window as any).gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: mainEvent,
        });

        if (mainResponse.result?.id) {
            console.log("✈️ [GoogleCalendar] Main event created with ID:", mainResponse.result.id);
            createdEventIds.push(mainResponse.result.id);
        } else {
            console.error("❌ [GoogleCalendar] Main event created but ID missing!", mainResponse);
        }
        onProgress?.(1, totalEvents);

        // 2. Create Detailed Daily Activities
        if (trip.data?.days && Array.isArray(trip.data.days)) {
            const tripStart = new Date(startDate);
            let currentCount = 1;

            for (let i = 0; i < trip.data.days.length; i++) {
                const dayPlan = trip.data.days[i];
                const currentDayDate = new Date(tripStart);
                currentDayDate.setDate(tripStart.getDate() + i);
                const dateString = currentDayDate.toISOString().split('T')[0];

                if (dayPlan.activities && Array.isArray(dayPlan.activities)) {
                    for (const activity of dayPlan.activities) {
                        try {
                            if (!activity.time) continue;
                            const { start, end } = parseActivityTime(dateString, activity.time);

                            const activityEvent: CalendarEvent = {
                                summary: `${activity.title || 'Activity'} (${trip.destination})`,
                                description: `${activity.description || ''}\n\nLocation: ${activity.location || 'TBD'}\nDay ${i + 1}: ${dayPlan.theme}`,
                                location: activity.location,
                                start: { dateTime: start },
                                end: { dateTime: end },
                                colorId: '5',
                            };

                            const res = await (window as any).gapi.client.calendar.events.insert({
                                calendarId: 'primary',
                                resource: activityEvent,
                            });

                            if (res.result?.id) {
                                createdEventIds.push(res.result.id);
                            }

                            // Delay for rate limits
                            await new Promise(r => setTimeout(r, 200));
                            currentCount++;
                            onProgress?.(currentCount, totalEvents);

                        } catch (actErr) {
                            console.warn(`⚠️ [GoogleCalendar] Failed to create activity`, actErr);
                        }
                    }
                }
            }
        }

        return { success: true, eventIds: createdEventIds };
    } catch (error: any) {
        console.error('❌ [GoogleCalendar] Create event failed:', error);
        return { success: false, error: error.message || 'Failed to create event' };
    }
};

interface CalendarEvent {
    summary: string;
    description: string;
    location?: string;
    start: { date?: string; dateTime?: string };
    end: { date?: string; dateTime?: string };
    colorId?: string;
}

// Global token client reference
let tokenClient: any = null;
let gapiLoaded = false;
let gisLoaded = false;

let gapiLoadingPromise: Promise<void> | null = null;
let gisLoadingPromise: Promise<void> | null = null;

// Helper to prevent hanging promises
const withTimeout = (promise: Promise<void>, ms: number, label: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout: ${label} took longer than ${ms}ms`));
        }, ms);

        promise.then(() => {
            clearTimeout(timer);
            resolve();
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
};

/**
 * Load the Google API (gapi) script - Pure Script Load Only
 */
const loadGapiScript = (): Promise<void> => {
    if (gapiLoaded) return Promise.resolve();
    if (gapiLoadingPromise) return gapiLoadingPromise;

    console.log("⏳ [GoogleCalendar] Injecting api.js...");

    gapiLoadingPromise = withTimeout(
        new Promise<void>((resolve, reject) => {
            if ((window as any).gapi) {
                gapiLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement("script");
            script.src = "https://apis.google.com/js/api.js";
            script.async = true;

            script.onload = () => {
                if (!(window as any).gapi) {
                    reject(new Error("GAPI loaded but window.gapi missing"));
                    return;
                }
                console.log("✅ [GoogleCalendar] api.js script loaded.");
                gapiLoaded = true;
                resolve();
            };

            script.onerror = () => {
                console.error("❌ [GoogleCalendar] Failed to load api.js");
                reject(new Error("Failed to load Google API script"));
            };

            document.body.appendChild(script);
        }),
        60000,
        "GAPI Script Load"
    );

    return gapiLoadingPromise;
};

/**
 * Load the Google Identity Services (GIS) script
 */
const loadGisScript = (): Promise<void> => {
    if (gisLoaded) return Promise.resolve();
    if (gisLoadingPromise) return gisLoadingPromise;

    const loadTask = new Promise<void>((resolve, reject) => {
        if ((window as any).google?.accounts?.oauth2) {
            gisLoaded = true;
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
            gisLoaded = true;
            resolve();
        };
        script.onerror = (err) => {
            gisLoadingPromise = null;
            reject(err);
        };
        document.body.appendChild(script);
    });

    gisLoadingPromise = withTimeout(loadTask, 20000, "GIS Load");
    return gisLoadingPromise;
};

/**
 * Initialize Google Calendar API and Identity Services
 */
export const initGoogleCalendar = async (): Promise<boolean> => {
    try {
        // 1. Load basic scripts (gapi + gis)
        await Promise.all([loadGapiScript(), loadGisScript()]);

        // 2. Load the 'client' library onto gapi (without init)
        // This is necessary because loadGapiScript only loads api.js
        if (!(window as any).gapi.client) {
            console.log("⏳ [GoogleCalendar] Loading 'client' library...");
            await new Promise<void>((resolve) => (window as any).gapi.load('client', resolve));
            console.log("✅ [GoogleCalendar] 'client' library loaded.");
        }

        return true;
    } catch (error) {
        console.error('❌ [GoogleCalendar] Failed to load scripts:', error);
        return false;
    }
};

/**
 * Check if calendar is connected (has valid token)
 * NOTE: This only checks local state. For expired tokens, use refreshTokenIfNeeded()
 */
export const isCalendarConnected = (): boolean => {
    const connected = localStorage.getItem(STORAGE_KEYS.CONNECTED);
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

    if (!connected || connected !== 'true') {
        // Don't log warning for normal "not connected" state
        return false;
    }

    if (!expiry) {
        console.warn("⚠️ [GoogleCalendar] Missing expiry.");
        return false;
    }

    // Check if token has expired - but DON'T disconnect here!
    // Let the caller handle refresh attempts
    if (Date.now() > parseInt(expiry)) {
        console.log(`ℹ️ [GoogleCalendar] Token expired. Will attempt refresh on next API call.`);
        // Return true so callers attempt to use/refresh the token
        // instead of immediately prompting for reconnect
        return true;
    }

    return true;
};

/**
 * Check if token is currently valid (not expired)
 */
const isTokenValid = (): boolean => {
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiry) return false;
    // Add 60 second buffer to avoid edge cases
    return Date.now() < (parseInt(expiry) - 60000);
};

/**
 * Silently refresh the access token without user interaction
 * Returns true if refresh succeeded, false if manual re-auth is needed
 */
export const refreshTokenIfNeeded = async (): Promise<boolean> => {
    // If token is still valid, no refresh needed
    if (isTokenValid()) {
        return true;
    }

    const connected = localStorage.getItem(STORAGE_KEYS.CONNECTED);
    if (!connected || connected !== 'true') {
        console.log('ℹ️ [GoogleCalendar] Not connected, cannot refresh.');
        return false;
    }

    console.log('🔄 [GoogleCalendar] Token expired, attempting silent refresh...');

    try {
        // Ensure scripts are loaded
        await initGoogleCalendar();

        if (!GOOGLE_CLIENT_ID) {
            console.error('❌ [GoogleCalendar] Missing VITE_GOOGLE_CLIENT_ID');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            // Create a new token client for silent refresh
            const refreshClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: CALENDAR_SCOPES,
                callback: (response: any) => {
                    if (response.error) {
                        console.warn('⚠️ [GoogleCalendar] Silent refresh failed:', response.error);
                        // Don't disconnect - let user manually reconnect when they try an action
                        resolve(false);
                        return;
                    }

                    // Store new tokens
                    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
                    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(Date.now() + (response.expires_in * 1000)));
                    localStorage.setItem(STORAGE_KEYS.CONNECTED, 'true');

                    // Set token for gapi
                    if ((window as any).gapi?.client) {
                        (window as any).gapi.client.setToken({ access_token: response.access_token });
                    }

                    console.log('✅ [GoogleCalendar] Token refreshed silently!');
                    resolve(true);
                },
                error_callback: (error: any) => {
                    console.warn('⚠️ [GoogleCalendar] Silent refresh error:', error);
                    resolve(false);
                }
            });

            // Request token without prompt (silent refresh)
            // This works if user has an active Google session
            refreshClient.requestAccessToken({ prompt: '' });
        });
    } catch (error) {
        console.error('❌ [GoogleCalendar] Refresh failed:', error);
        return false;
    }
};



/**
 * Get the stored access token
 */
const getAccessToken = (): string | null => {
    if (!isCalendarConnected()) return null;
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

/**
 * Get access token with automatic refresh if expired
 */
export const getValidAccessToken = async (): Promise<string | null> => {
    if (!isCalendarConnected()) return null;

    // Attempt refresh if needed
    const refreshed = await refreshTokenIfNeeded();
    if (!refreshed && !isTokenValid()) {
        console.warn('⚠️ [GoogleCalendar] Could not get valid token');
        return null;
    }

    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

/**
 * Connect to Google Calendar via OAuth popup
 */
export const connectCalendar = (): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Ensure scripts are loaded
            await initGoogleCalendar();

            if (!GOOGLE_CLIENT_ID) {
                console.error('❌ [GoogleCalendar] Missing VITE_GOOGLE_CLIENT_ID in environment');
                reject(new Error('Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.'));
                return;
            }

            // Initialize token client
            tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: CALENDAR_SCOPES,
                callback: (response: any) => {
                    if (response.error) {
                        console.error('❌ [GoogleCalendar] OAuth error:', response.error);
                        reject(new Error(response.error));
                        return;
                    }

                    // Store tokens
                    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
                    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(Date.now() + (response.expires_in * 1000)));
                    localStorage.setItem(STORAGE_KEYS.CONNECTED, 'true');

                    // Set token for gapi
                    (window as any).gapi.client.setToken({ access_token: response.access_token });

                    console.log('✅ [GoogleCalendar] Connected successfully');
                    resolve(true);
                },
            });

            // Request access token (shows popup)
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (error) {
            console.error('❌ [GoogleCalendar] Connection failed:', error);
            reject(error);
        }
    });
};

/**
 * Handle OAuth redirect - call this on page load to check for tokens in URL hash
 * (Kept for fallback/future use)
 */
export const handleOAuthRedirect = (): boolean => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
        return false;
    }

    console.log('🔑 [GoogleCalendar] Detected OAuth redirect, parsing token...');

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (!accessToken || !expiresIn) {
        console.error('❌ [GoogleCalendar] Invalid OAuth response');
        return false;
    }

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(Date.now() + (parseInt(expiresIn) * 1000)));
    localStorage.setItem(STORAGE_KEYS.CONNECTED, 'true');

    console.log('✅ [GoogleCalendar] Connected via redirect flow!');

    const originalUrl = sessionStorage.getItem('voyageur_gcal_redirect_origin');
    sessionStorage.removeItem('voyageur_gcal_redirect_origin');
    window.history.replaceState(null, '', originalUrl || window.location.pathname);

    return true;
};

/**
 * Disconnect from Google Calendar
 */
export const disconnectCalendar = (): void => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    // Revoke token if exists
    if (token && (window as any).google?.accounts?.oauth2) {
        (window as any).google.accounts.oauth2.revoke(token, () => {
            console.log('✅ [GoogleCalendar] Token revoked');
        });
    }

    // Clear gapi token
    if ((window as any).gapi?.client) {
        (window as any).gapi.client.setToken(null);
    }

    // Clear Storage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.CONNECTED);

    console.log('✅ [GoogleCalendar] Disconnected');
};

/**
 * Calculate end date from start date and duration string
 */
const calculateEndDate = (startDate: string, duration: string): string => {
    const start = new Date(startDate);

    // Parse duration like "5 Days", "3 days", "1 Week", etc.
    const match = duration.match(/(\d+)\s*(day|days|week|weeks)/i);
    let daysToAdd = 1;

    if (match) {
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        daysToAdd = unit.includes('week') ? num * 7 : num;
    }

    const end = new Date(start);
    end.setDate(end.getDate() + daysToAdd);

    return end.toISOString().split('T')[0]; // YYYY-MM-DD format
};

/**
 * Helper to parse activity time string (e.g. "10:00 AM", "14:00")
 */
const parseActivityTime = (dateStr: string, timeStr: string): { start: string, end: string } => {
    try {
        const date = new Date(dateStr);
        let hours = 9; // Default 9 AM
        let minutes = 0;

        // Simple time parsing
        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2]);
            const period = timeMatch[3]?.toUpperCase();

            if (period === 'PM' && hours < 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
        }

        date.setHours(hours, minutes, 0);
        const end = new Date(date);
        end.setHours(hours + 2, minutes, 0); // Default 2 hour duration

        return {
            start: date.toISOString(),
            end: end.toISOString()
        };
    } catch (e) {
        // Fallback
        return {
            start: new Date(dateStr).toISOString(),
            end: new Date(dateStr).toISOString()
        };
    }
};

/**
 * Delete a calendar event
 */
export const deleteTripEvent = async (eventId: string): Promise<boolean> => {
    try {
        // Use auto-refreshing token getter
        const accessToken = await getValidAccessToken();

        if (!accessToken) {
            return false;
        }

        await initGoogleCalendar();
        (window as any).gapi.client.setToken({ access_token: accessToken });

        await (window as any).gapi.client.calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });

        console.log('✅ [GoogleCalendar] Event deleted:', eventId);
        return true;
    } catch (error) {
        console.error('❌ [GoogleCalendar] Failed to delete event:', error);
        return false;
    }
};

/**
 * STRICT Verification: Attempt to make a real API call to confirm the token works.
 * This is necessary because a token might be valid locally (expiry in future)
 * but revoked on the server side.
 */
export const verifyConnection = async (): Promise<boolean> => {
    try {
        if (!isCalendarConnected()) return false;

        // Ensure we have a token (refresh if needed)
        const token = await getValidAccessToken();
        if (!token) return false;

        // Initialize API
        await initGoogleCalendar();

        // Ensure Calendar API is loaded
        if (!(window as any).gapi.client.calendar) {
            await (window as any).gapi.client.load('calendar', 'v3');
        }

        // Make a lightweight API call: List just 1 event to prove access
        // calendars.get requires 'calendar' scope, but we use 'calendar.events'
        try {
            await (window as any).gapi.client.calendar.events.list({
                calendarId: 'primary',
                maxResults: 1,
                timeMin: new Date().toISOString()
            });
            console.log('✅ [GoogleCalendar] Connection verified active via API.');
            return true;
        } catch (apiError: any) {
            console.warn('⚠️ [GoogleCalendar] Token verification failed:', apiError);
            if (apiError.status === 401 || apiError.status === 403) {
                // Token revoked or invalid
                disconnectCalendar();
                return false;
            }
            // Other errors (network etc) might not mean disconnected, but let's be strict for now
            // logic: if we can't talk to google, we aren't connected
            return false;
        }
    } catch (e) {
        console.error('❌ [GoogleCalendar] Verification error:', e);
        return false;
    }
};

// Export service object for convenience
export const googleCalendarService = {
    init: initGoogleCalendar,
    connect: connectCalendar,
    disconnect: disconnectCalendar,
    isConnected: isCalendarConnected,
    handleRedirect: handleOAuthRedirect,  // NEW: Handle OAuth redirect on page load
    refreshToken: refreshTokenIfNeeded,
    verifyConnection: verifyConnection,
    getValidToken: getValidAccessToken,
    createTripEvent: createTripEvent,
    createEvent: createTripEvent,     // Alias
    deleteTripEvents: deleteTripEvents,
    // Alias singular delete for older code compatibility, wrapping as array delete
    deleteEvent: async (id: string) => deleteTripEvents([id])
};

export default googleCalendarService;
