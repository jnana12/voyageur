
import { TripItinerary, Activity } from "../types";

export interface LogisticsAnomalies {
    hasAnomalies: boolean;
    anomalies: {
        day: number;
        activityIndex: number;
        type: 'TIME_OVERLAP' | 'IMPOSSIBLE_TRANSIT' | 'DUPLICATE_LOCATION' | 'OFF_HOURS' | 'MEAL_TIME_ANOMALY' | 'BACKTRACKING_DETECTED' | 'TRANSIT_MODE_ANOMALY';
        explanation: string;
    }[];
}

// Haversine distance in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Check if point C is "along the way" from A to B (within 15% detour)
const isAlongTheWay = (latA: number, lonA: number, latB: number, lonB: number, latC: number, lonC: number): boolean => {
    const distAB = getDistance(latA, lonA, latB, lonB);
    const distAC = getDistance(latA, lonA, latC, lonC);
    const distCB = getDistance(latC, lonC, latB, lonB);
    return (distAC + distCB) < (distAB * 1.15);
};

// Calculate total route distance for a sequence of activities
const getTotalRouteDistance = (activities: Activity[]): number => {
    let total = 0;
    for (let i = 1; i < activities.length; i++) {
        const prev = activities[i - 1];
        const curr = activities[i];
        if (prev.coordinates && curr.coordinates) {
            total += getDistance(
                prev.coordinates.lat, prev.coordinates.lng,
                curr.coordinates.lat, curr.coordinates.lng
            );
        }
    }
    return total;
};

/**
 * Optimize activities to minimize total travel distance using nearest-neighbor heuristic
 * Preserves the first activity (start point) and reorders the rest
 */
export const optimizeRouteOrder = (activities: Activity[]): Activity[] => {
    // Only optimize if we have enough activities with coordinates
    const activitiesWithCoords = activities.filter(a => a.coordinates?.lat && a.coordinates?.lng);

    if (activitiesWithCoords.length < 3) {
        return activities; // Not enough to optimize
    }

    const originalDistance = getTotalRouteDistance(activitiesWithCoords);

    // Keep track of activities without coords to append at end
    const activitiesWithoutCoords = activities.filter(a => !a.coordinates?.lat || !a.coordinates?.lng);

    // Use nearest-neighbor algorithm starting from first activity
    const optimized: Activity[] = [];
    const remaining = [...activitiesWithCoords];

    // Start with the first activity (don't change start point)
    optimized.push(remaining.shift()!);

    while (remaining.length > 0) {
        const last = optimized[optimized.length - 1];
        if (!last.coordinates) break;

        let nearestIdx = 0;
        let nearestDist = Infinity;

        remaining.forEach((act, idx) => {
            if (act.coordinates) {
                const dist = getDistance(
                    last.coordinates!.lat, last.coordinates!.lng,
                    act.coordinates.lat, act.coordinates.lng
                );
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = idx;
                }
            }
        });

        optimized.push(remaining.splice(nearestIdx, 1)[0]);
    }

    const optimizedDistance = getTotalRouteDistance(optimized);

    console.log(`[RouteOptimizer] Original: ${originalDistance.toFixed(2)}km → Optimized: ${optimizedDistance.toFixed(2)}km (saved ${(originalDistance - optimizedDistance).toFixed(2)}km)`);

    // Append activities without coords at the end
    return [...optimized, ...activitiesWithoutCoords];
};

/**
 * Detect backtracking in the itinerary
 */
export const detectBacktracking = (activities: Activity[]): { hasBacktracking: boolean; details: string[] } => {
    const details: string[] = [];

    for (let i = 2; i < activities.length; i++) {
        const a = activities[i - 2];
        const b = activities[i - 1];
        const c = activities[i];

        if (a.coordinates && b.coordinates && c.coordinates) {
            // Check if C is closer to A than B is (indicating we went far then came back)
            const distAB = getDistance(a.coordinates.lat, a.coordinates.lng, b.coordinates.lat, b.coordinates.lng);
            const distAC = getDistance(a.coordinates.lat, a.coordinates.lng, c.coordinates.lat, c.coordinates.lng);
            const distBC = getDistance(b.coordinates.lat, b.coordinates.lng, c.coordinates.lat, c.coordinates.lng);

            // If we went from A to B (far), then B to C (even farther back toward A), it's backtracking
            if (distAC < distAB * 0.5 && distBC > distAB * 0.5) {
                details.push(`Backtracking: "${b.title}" → "${c.title}" returns toward "${a.title}"`);
            }
        }
    }

    return { hasBacktracking: details.length > 0, details };
};

export const runLocalHeuristics = (itinerary: TripItinerary): LogisticsAnomalies => {
    const report: LogisticsAnomalies = { hasAnomalies: false, anomalies: [] };

    itinerary.days.forEach((day, dIdx) => {
        let lastTimeInMinutes = -1;
        let lastCoords: { lat: number, lng: number } | null = null;
        const dayActivities = day.activities;

        // Check for backtracking
        const backtrackCheck = detectBacktracking(dayActivities);
        if (backtrackCheck.hasBacktracking) {
            report.anomalies.push({
                day: dIdx + 1,
                activityIndex: 0,
                type: 'BACKTRACKING_DETECTED',
                explanation: backtrackCheck.details.join('; ')
            });
        }

        dayActivities.forEach((act, aIdx) => {
            const timeParts = act.time.match(/(\d+):(\d+)/);
            if (timeParts) {
                const hours = parseInt(timeParts[1]);
                const minutes = parseInt(timeParts[2]);
                const currentTime = (hours * 60) + minutes;

                if (currentTime <= lastTimeInMinutes) {
                    report.anomalies.push({ day: dIdx + 1, activityIndex: aIdx, type: 'TIME_OVERLAP', explanation: `Activity starts too early.` });
                }

                if (lastCoords && act.coordinates) {
                    const dist = getDistance(lastCoords.lat, lastCoords.lng, act.coordinates.lat, act.coordinates.lng);
                    const timeGap = currentTime - lastTimeInMinutes;
                    if (timeGap < (dist / 20) * 60 && dist > 5) {
                        report.anomalies.push({ day: dIdx + 1, activityIndex: aIdx, type: 'IMPOSSIBLE_TRANSIT', explanation: `Too far to travel in this time.` });
                    }
                }
                lastTimeInMinutes = currentTime;
                if (act.coordinates) lastCoords = act.coordinates;
            }
        });
    });

    report.hasAnomalies = report.anomalies.length > 0;
    return report;
};
