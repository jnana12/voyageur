import { supabase } from './supabaseClient';

/**
 * TomTom Geocoding Service
 * Converts place names to coordinates using TomTom Search API
 */

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || "";

interface GeocodingResult {
    lat: number;
    lng: number;
    formattedAddress?: string;
}

/**
 * Simple delay utility
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocode a place name or address to coordinates with retry logic
 * @param query - The place name, address, or POI to geocode
 * @param options - Optional parameters
 * @returns Promise with lat/lng or null if not found
 */
export async function geocodePlace(
    query: string,
    options?: {
        /** Bias results to a specific country (ISO 3166-1 alpha-2) */
        countrySet?: string;
        /** Limit results to a specific radius (in meters) from a center point */
        center?: [number, number]; // [lat, lng]
        radius?: number;
    },
    retries = 2
): Promise<GeocodingResult | null> {
    if (!query || !TOMTOM_API_KEY) {
        console.warn("geocodePlace: Missing query or API key");
        return null;
    }

    const normalizedQuery = query.toLowerCase().trim();

    // 1. Check Global DB Cache first
    if (supabase) {
        try {
            const { data: cached, error } = await supabase
                .from('geocoding_cache')
                .select('lat, lng, formatted_address')
                .eq('query', normalizedQuery)
                .maybeSingle();

            if (cached && !error) {
                return {
                    lat: cached.lat,
                    lng: cached.lng,
                    formattedAddress: cached.formatted_address
                };
            }
        } catch (e) {
            console.warn("Geocoding cache lookup failed:", e);
        }
    }

    const baseUrl = "https://api.tomtom.com/search/2/geocode";
    const encodedQuery = encodeURIComponent(query);

    let url = `${baseUrl}/${encodedQuery}.json?key=${TOMTOM_API_KEY}&limit=1`;

    if (options?.countrySet) {
        url += `&countrySet=${options.countrySet}`;
    }
    if (options?.center && options?.radius) {
        url += `&lat=${options.center[0]}&lon=${options.center[1]}&radius=${options.radius}`;
    }

    try {
        const response = await fetch(url);

        // Handle rate limiting with retry
        if (response.status === 429 && retries > 0) {
            console.warn(`Geocoding rate limited, retrying in 1s... (${retries} left)`);
            await delay(1000);
            return geocodePlace(query, options, retries - 1);
        }

        if (!response.ok) {
            console.error("Geocoding API error:", response.status);
            return null;
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const geocodedResult = {
                lat: result.position.lat,
                lng: result.position.lon,
                formattedAddress: result.address?.freeformAddress,
            };

            // 2. Save to Global DB Cache (Fire and Forget)
            if (supabase) {
                supabase.from('geocoding_cache').upsert({
                    query: normalizedQuery,
                    lat: geocodedResult.lat,
                    lng: geocodedResult.lng,
                    formatted_address: geocodedResult.formattedAddress
                }).then(({ error }) => {
                    if (error) console.warn("Geocoding cache save failed:", error.message);
                });
            }

            return geocodedResult;
        }
        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

/**
 * Geocode multiple places SEQUENTIALLY with delays to avoid rate limiting
 */
const geocodeCache = new Map<string, GeocodingResult | null>();

export async function geocodePlaces(
    places: string[],
    options?: { countrySet?: string }
): Promise<Map<string, GeocodingResult | null>> {
    const results = new Map<string, GeocodingResult | null>();

    const uncachedPlaces = places.filter((p) => !geocodeCache.has(p));

    // Process SEQUENTIALLY with delay to avoid 429 errors
    for (const place of uncachedPlaces) {
        const result = await geocodePlace(place, options);
        geocodeCache.set(place, result);

        // Add small delay between requests to stay under rate limit
        if (uncachedPlaces.indexOf(place) < uncachedPlaces.length - 1) {
            await delay(250); // 250ms between requests = ~4 req/sec
        }
    }

    // Return all results from cache
    places.forEach((place) => {
        results.set(place, geocodeCache.get(place) || null);
    });

    return results;
}

/**
 * Clear the geocoding cache
 */
export function clearGeocodeCache() {
    geocodeCache.clear();
}
