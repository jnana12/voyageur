/**
 * Geolocation Service
 * Uses browser's Geolocation API to get user's current position
 * and reverse geocode to get city/location name
 */

export interface UserLocation {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
    formatted?: string; // Full formatted address
    region?: string;    // State/Region
    source?: 'gps' | 'ip';
}

// Simple in-memory cache for geocoding
const geocodeCache = new Map<string, any>();
let lastRequestTime = 0;

/**
 * Get user's current location using browser Geolocation API
 * Returns coordinates and optionally reverse-geocoded address
 * @param requireConsent - Whether to enforce explicit user consent before requesting location
 */
export const getCurrentLocation = (requireConsent: boolean = true): Promise<UserLocation | null> => {
    return new Promise((resolve, reject) => {
        if (requireConsent) {
            console.log('🔒 Geolocation requires explicit user consent');
            // In a real app, you might show a custom modal here
        }

        // Check if geolocation is supported
        if (!navigator.geolocation) {
            console.warn('⚠️ Geolocation not supported by browser');
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log('📍 Got coordinates:', latitude, longitude);

                const location: UserLocation = {
                    lat: latitude,
                    lng: longitude,
                };

                // Try to reverse geocode using free service
                try {
                    const cityName = await reverseGeocode(latitude, longitude);
                    if (cityName) {
                        location.city = cityName.city;
                        location.country = cityName.country;
                        location.formatted = cityName.formatted;
                    }
                } catch (e) {
                    console.warn('Reverse geocoding failed:', e);
                }

                resolve(location);
            },
            (error) => {
                console.warn('⚠️ Geolocation error:', error.message);
                resolve(null);
            },
            {
                enableHighAccuracy: false, // Faster, less battery
                timeout: 10000, // 10 seconds
                maximumAge: 300000 // Cache for 5 minutes
            }
        );
    });
};

/**
 * Reverse geocode coordinates to get city name
 * Uses free OpenStreetMap Nominatim API
 * Rate limited to 1 request per second per Nominatim policy.
 */
const reverseGeocode = async (lat: number, lng: number): Promise<{ city: string; country: string; formatted: string } | null> => {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
        console.log('📦 [Geocoding] Cache hit for:', cacheKey);
        return geocodeCache.get(cacheKey);
    }

    // Rate limiting: Ensure at least 1000ms between requests
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLast));
    }
    lastRequestTime = Date.now();

    try {
        // Using OpenStreetMap Nominatim (free, no API key needed)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
            {
                headers: {
                    'User-Agent': 'Voyageur Travel App (https://voyageur.ai)'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Geocoding failed with status: ${response.status}`);
        }

        const data = await response.json();

        // Extract city from address
        const address = data.address || {};
        const city = address.city || address.town || address.village || address.county || address.state || 'Unknown';
        const country = address.country || '';

        const result = {
            city,
            country,
            formatted: `${city}, ${country}`
        };

        geocodeCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
};

/**
 * Check if location permission is granted
 */
export const checkLocationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
    if (!navigator.permissions) {
        return 'prompt'; // Fallback for browsers without permissions API
    }

    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
    } catch {
        return 'prompt';
    }
};

/**
 * Get location based on IP address (approximate)
 * Uses free ipapi.co or similar service
 */
export const getIPLocation = async (): Promise<UserLocation | null> => {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.error) {
            console.warn('IP Geolocation error:', data.reason);
            return null;
        }

        return {
            lat: data.latitude,
            lng: data.longitude,
            city: data.city,
            region: data.region,
            country: data.country_name,
            formatted: `${data.city}, ${data.region}`,
            source: 'ip'
        };
    } catch (error) {
        console.warn('IP Geolocation failed:', error);
        return null;
    }
};

/**
 * Get list of suggested major cities based on region/country
 */
export const getSuggestedCities = (currentLocation?: UserLocation | null): string[] => {
    const MAJOR_CITIES = [
        'Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad',
        'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi'
    ];

    // If we have location info, we could prioritize nearby cities
    // For now, return top major cities, filtering out current if present
    if (currentLocation?.city) {
        return [
            currentLocation.city,
            ...MAJOR_CITIES.filter(c => c !== currentLocation.city)
        ].slice(0, 5);
    }

    return MAJOR_CITIES.slice(0, 5);
};

export default {
    getCurrentLocation,
    checkLocationPermission,
    getIPLocation,
    getSuggestedCities
};
