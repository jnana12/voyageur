// utils/storage.ts
// Safe localStorage helpers for persistent dashboard data

export const getLocal = <T>(key: string, fallback: T): T => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
};

export const setLocal = (key: string, value: any): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Silently fail if localStorage is unavailable
    }
};

export const removeLocal = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch {
        // Silently fail
    }
};

// Dashboard-specific keys
export const STORAGE_KEYS = {
    STATS: 'voyageur_stats_v1',
    SETTINGS: 'voyageur_settings_v1',
    ACTIVE_TAB: 'voyageur_active_tab',
    LAST_UPDATED: 'voyageur_last_updated'
};

// Default stats for instant UI render
export const DEFAULT_STATS = {
    totalSpend: 0,
    tripCount: 0,
    citiesVisited: 0,
    recentTrips: []
};
