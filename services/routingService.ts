/**
 * TomTom Routing Service
 * Calculates actual road routes between waypoints using TomTom Routing API
 */

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || "";

interface RouteResult {
    /** GeoJSON coordinates for the route polyline [lng, lat][] */
    coordinates: [number, number][];
    /** Total distance in meters */
    distanceMeters: number;
    /** Total travel time in seconds */
    travelTimeSeconds: number;
}

/**
 * Calculate a driving route through multiple waypoints
 * @param waypoints Array of [lng, lat] coordinates
 * @returns Promise with route geometry and stats
 */
export async function calculateRoute(
    waypoints: [number, number][]
): Promise<RouteResult | null> {
    if (!waypoints || waypoints.length < 2) {
        console.warn("calculateRoute: Need at least 2 waypoints");
        return null;
    }

    if (!TOMTOM_API_KEY) {
        console.warn("calculateRoute: Missing TomTom API key");
        return null;
    }

    // TomTom expects waypoints as "lat,lng:lat,lng:..."
    const waypointString = waypoints
        .map(([lng, lat]) => `${lat},${lng}`)
        .join(":");

    // Use local proxy to avoid CORS issues
    const url = `/tomtom/routing/1/calculateRoute/${waypointString}/json?key=${TOMTOM_API_KEY}&routeType=fastest&traffic=true&travelMode=car`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error details');
            console.error(`Routing API error (${response.status}):`, errorText);
            return null;
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            console.warn("calculateRoute: No route found");
            return null;
        }

        const route = data.routes[0];

        // Extract all leg points into a single coordinate array
        const coordinates: [number, number][] = [];

        for (const leg of route.legs) {
            for (const point of leg.points) {
                // TomTom returns {latitude, longitude}, convert to [lng, lat]
                coordinates.push([point.longitude, point.latitude]);
            }
        }

        return {
            coordinates,
            distanceMeters: route.summary?.lengthInMeters || 0,
            travelTimeSeconds: route.summary?.travelTimeInSeconds || 0,
        };
    } catch (error) {
        console.error("Routing error:", error);
        return null;
    }
}

/**
 * Cache for route calculations
 */
const routeCache = new Map<string, RouteResult | null>();

function getCacheKey(waypoints: [number, number][]): string {
    return waypoints.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join("|");
}

/**
 * Calculate route with caching
 */
export async function calculateRouteCached(
    waypoints: [number, number][]
): Promise<RouteResult | null> {
    const key = getCacheKey(waypoints);

    if (routeCache.has(key)) {
        return routeCache.get(key) || null;
    }

    const result = await calculateRoute(waypoints);
    routeCache.set(key, result);
    return result;
}

/**
 * Clear the routing cache
 */
export function clearRouteCache() {
    routeCache.clear();
}
