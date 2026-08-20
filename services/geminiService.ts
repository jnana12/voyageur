
import { TripItinerary, DiningRecommendation } from "../types";

// Removed direct GoogleGenAI import to run on client
// We now fetch from our Vercel serverless function at /api/gemini

const API_ENDPOINT = '/api/gemini';

const cleanJson = (text: string) => {
    // Remove markdown code block markers
    let cleaned = text.replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');

    // Sometimes models return text before or after the JSON block
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) start = firstBrace;
    else if (firstBracket !== -1) start = firstBracket;

    if (start !== -1) {
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);
        if (end !== -1) {
            cleaned = cleaned.substring(start, end + 1);
        }
    }

    return cleaned;
};

const sanitizeItinerary = (data: any): TripItinerary => {
    return {
        ...data,
        travelOptions: Array.isArray(data.travelOptions) ? data.travelOptions : [],
        accommodation: Array.isArray(data.accommodation) ? data.accommodation : [],
        days: Array.isArray(data.days) ? data.days.map((day: any) => ({
            ...day,
            activities: Array.isArray(day.activities) ? day.activities : []
        })) : []
    };
};

/**
 * Generic function to call the backend API
 */
const callGeminiApi = async (payload: any) => {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Gemini Backend Error Data:", errorData);

            const message = errorData.message || errorData.details || errorData.sdk_error || errorData.rest_error || response.statusText;

            if (response.status === 500 && (message.includes('404') || message.includes('not found'))) {
                throw new Error("Model not found. Please check if your Gemini API key is active and has access to 1.5 Flash.");
            }

            throw new Error(`API Request Failed: ${response.status} - ${message}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Gemini API Proxy Error:", error);
        throw error;
    }
};

export const generateItinerary = async (
    prompt: string,
    startingLocation?: string,
    preferences?: { dietary?: string; luxury?: number }
): Promise<TripItinerary> => {

    // Build context with starting location if available
    const locationContext = startingLocation
        ? `ORIGIN CONTEXT: The traveler is starting from ${startingLocation}. Return 3 realistic travel options (Flight/Train/Bus) specifically FROM ${startingLocation} TO the destination.`
        : '';

    // Build preference context
    const luxuryTierMap: { [key: number]: string } = {
        1: 'Budget (Hostels, 1-2 star, street food)',
        2: 'Economy (3-star, decent cafes, public transport)',
        3: 'Comfort (4-star, nice restaurants, cabs)',
        4: 'Premium (5-star, fine dining, private taxis)',
        5: 'Ultra-Luxury (Top-tier resorts, exclusive experiences)'
    };

    const preferenceContext = preferences ? `
    STRICT USER PREFERENCES:
    ${preferences.dietary && preferences.dietary !== 'None' ? `- DIETARY: ${preferences.dietary}. (Filter ALL food recommendations to strictly be ${preferences.dietary}).` : ''}
    ${preferences.luxury ? `- BUDGET TIER: ${luxuryTierMap[preferences.luxury]}. (Ensure Hotels and Restaurants align with this tier).` : ''}
    ` : '';

    const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
        try {
            return await fn();
        } catch (error: any) {
            if (retries > 0 && (error?.message?.includes('503') || error?.message?.includes('429') || error?.status === 503)) {
                console.warn(`API Overloaded. Retrying in ${delay}ms... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return retryWithBackoff(fn, retries - 1, delay * 2);
            }
            throw error;
        }
    };

    // Simplified Schema Definitions for Client-to-Server
    // (Keep your existing responseSchema definition here... omitted for brevity)
    const responseSchema = {
        type: "OBJECT",
        properties: {
            destination: { type: "STRING" },
            duration: { type: "STRING" },
            totalEstimatedCost: { type: "STRING" },
            summary: { type: "STRING" },
            travelOptions: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        type: { type: "STRING", enum: ["FLIGHT", "TRAIN", "BUS", "CAR"] },
                        provider: { type: "STRING" },
                        departureTime: { type: "STRING" },
                        arrivalTime: { type: "STRING" },
                        duration: { type: "STRING" },
                        price: { type: "STRING" },
                        departureLocation: { type: "STRING" },
                        arrivalLocation: { type: "STRING" },
                        bookingLink: { type: "STRING" }
                    }
                }
            },
            accommodation: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING" },
                        type: { type: "STRING" },
                        rating: { type: "STRING" },
                        pricePerNight: { type: "STRING" },
                        location: { type: "STRING" },
                        description: { type: "STRING" },
                        amenities: { type: "ARRAY", items: { type: "STRING" } },
                        checkInTime: { type: "STRING" }
                    }
                }
            },
            days: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        day: { type: "STRING" },
                        theme: { type: "STRING" },
                        activities: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    time: { type: "STRING" },
                                    title: { type: "STRING" },
                                    description: { type: "STRING" },
                                    location: { type: "STRING" },
                                    estimatedCost: { type: "STRING" },
                                    bookingRequired: { type: "BOOLEAN" },
                                    transitFromPrev: {
                                        type: "OBJECT",
                                        properties: {
                                            mode: { type: "STRING" },
                                            duration: { type: "STRING" },
                                            cost: { type: "STRING" },
                                            instruction: { type: "STRING" }
                                        },
                                        description: "How to get here from previous location"
                                    }
                                },
                                required: ["time", "title", "location"]
                            }
                        }
                    },
                    required: ["day", "activities"]
                }
            },
            dna: {
                type: "OBJECT",
                description: "Analyze the generated itinerary and rate it on these 4 axes. Scores MUST sum to exactly 100.",
                properties: {
                    Adventure: { type: "NUMBER" },
                    Luxury: { type: "NUMBER" },
                    Culture: { type: "NUMBER" },
                    Relaxation: { type: "NUMBER" }
                },
                required: ["Adventure", "Luxury", "Culture", "Relaxation"]
            }
        },
        required: ["destination", "duration", "days", "dna"]
    };

    // --- IMPROVED PROMPT START ---
    const contents = `
    GOAL: Generate a strictly executable, geographically logical travel itinerary for: "${prompt}". 
    MANDATORY CONFIGURATION: This trip is for exactly ONE traveler. All travel options and accommodation costs MUST be for a single person.

    CONTEXT:
    ${locationContext}
    ${preferenceContext}

    CRITICAL INSTRUCTIONS FOR GENERATION:

    1. GEOGRAPHIC CLUSTERING (MANDATORY - The "No-Teleporting" Rule):
       - BEFORE generating, mentally divide the city into zones (North, South, East, West, Central).
       - Group ALL morning activities in ONE zone, afternoon activities in an ADJACENT zone.
       - NEVER alternate between distant zones (e.g., North → South → North is FORBIDDEN).
       - Order activities so each is PHYSICALLY CLOSE to the previous one (nearest-neighbor logic).
       - Example correct flow: Hotel (Central) → Museum (Central) → Park (South-Central) → Temple (South).

    2. REALISTIC LOGISTICS & STRICT MEAL RULES:
       - 'transitFromPrev' is CRITICAL. Calculate travel time based on ACTUAL distances and HEAVY CITY TRAFFIC (assume 20km/h avg speed in cities).
       - NEVER MAKE MEALS MAIN ACTIVITIES. "Lunch", "Dinner", or "Breakfast" MUST NOT be their own standalone 'activity' boxes. 
       - Instead, add meal stops directly into the 'transitFromPrev.instruction' of the NEXT destination (e.g. "Walk 5 mins. Stop at Cafe Local for a 60 min lunch before heading to the Museum").
       - The 'activities' array should ONLY contain actual places of interest, landmarks, museums, beaches, or major events. 
       - If the user arrives by flight, Day 1 must start with "Travel from Airport to Hotel" (include realistic airport transit time).

    3. TIME DISCIPLINE:
       - Use 24-hour format (HH:MM) strictly.
       - NO OVERLAPS. Activity End Time + Transit Time < Next Activity Start Time.
       - Include realistic durations: Breakfast (45m), Lunch (60m), Dinner (90m), Museums (2h+).

     4. DATA REQUIREMENTS:
        - Prices: ALL in Indian Rupees (₹).
        - Locations: Be specific and complete (e.g., "Cubbon Park, MG Road Entrance, Bengaluru" not just "Park"). Include city name for accurate mapping.
    
     5. COMPLETE ARRAYS:
        - Provide exactly 3 Travel Options (Bus/Train/Flight) to get TO the destination.
        - Provide exactly 4 Accommodation options matching the budget tier.
        - Populate 'days' and 'activities' fully.

     6. COORDINATE INTEGRITY:
        - Return trips (e.g., "Departure to [Starting City]") MUST use the coordinates of the [Starting City].
        - Airport/Railway station activities MUST use the actual coordinates of that station, NOT the city center.
        - Ensure every activity has a 'location' string that is specific enough for geocoding.

    OUTPUT FORMAT:
    Return ONLY valid JSON matching the schema provided.
    `;
    // --- IMPROVED PROMPT END ---

    const response = await retryWithBackoff(() => callGeminiApi({
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    }));

    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        try {
            const parsed = JSON.parse(cleanJson(response.candidates[0].content.parts[0].text));
            return sanitizeItinerary(parsed);
        } catch (e) {
            console.error("Failed to parse itinerary JSON", e);
            throw new Error("Failed to parse itinerary");
        }
    }
    throw new Error("Failed to generate itinerary");
};

/**
 * Regenerate itinerary days based on selected travel and accommodation options
 */
export const regenerateItineraryDays = async (
    baseItinerary: TripItinerary,
    selectedTravel: { arrivalTime: string; arrivalLocation: string; type: string } | null,
    selectedHotel: { name: string; location: string } | null
): Promise<TripItinerary> => {

    // Build context from selections
    const travelContext = selectedTravel
        ? `The traveler arrives at ${selectedTravel.arrivalLocation} at ${selectedTravel.arrivalTime} via ${selectedTravel.type}.`
        : '';

    const hotelContext = selectedHotel
        ? `They are staying at ${selectedHotel.name} located in ${selectedHotel.location}.`
        : '';

    const responseSchema = {
        type: "OBJECT",
        properties: {
            days: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        day: { type: "STRING" },
                        theme: { type: "STRING" },
                        activities: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    time: { type: "STRING" },
                                    title: { type: "STRING" },
                                    description: { type: "STRING" },
                                    location: { type: "STRING" },
                                    estimatedCost: { type: "STRING" },
                                    bookingRequired: { type: "BOOLEAN" },
                                    transitFromPrev: {
                                        type: "OBJECT",
                                        properties: {
                                            mode: { type: "STRING" },
                                            duration: { type: "STRING" },
                                            cost: { type: "STRING" },
                                            instruction: { type: "STRING" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    const response = await callGeminiApi({
        contents: `
        ROLE: You are an expert Logistics Architect and Local Guide.
        GOAL: Regenerate strictly the day-by-day itinerary for a trip to ${baseItinerary.destination} (${baseItinerary.duration}).

        CONTEXT:
        ${travelContext}
        ${hotelContext}

        CRITICAL INSTRUCTIONS FOR REGENERATION:

        1. HOTEL-CENTRIC GEOGRAPHY:
           - The user is staying at "${selectedHotel?.name || 'Central Hotel'}" in "${selectedHotel?.location || 'City Center'}".
           - Cluster activities geographically to minimize travel time from this specific hotel.
           - Do not bounce between distant neighborhoods randomly.

        2. REALISTIC LOGISTICS:
           - 'transitFromPrev' is CRITICAL. Calculate travel time based on ACTUAL distances and HEAVY CITY TRAFFIC (assume 20km/h avg speed).
           - Day 1: Starts AFTER arrival (${selectedTravel?.arrivalTime || '09:00'}). First step MUST be "Travel from ${selectedTravel?.arrivalLocation || 'Arrival Point'} to Hotel".
           - Ensure logical flow: Hotel -> Activity -> Lunch -> Activity -> Hotel.

        3. TIME DISCIPLINE:
           - Use 24-hour format (HH:MM) strictly.
           - NO OVERLAPS. Activity End + Transit < Next Start.
           - Include realistic durations (e.g., Dinner = 90 mins).

        4. DATA REQUIREMENTS:
           - Prices: ALL in Indian Rupees (₹).
           - Locations: Be specific and include city name (e.g., "Cubbon Park, MG Road Entrance, Bengaluru").

        Output ONLY the 'days' array valid JSON.
        `,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        try {
            const parsed = JSON.parse(cleanJson(response.candidates[0].content.parts[0].text));
            // Merge regenerated days with base itinerary
            return {
                ...baseItinerary,
                days: parsed.days || baseItinerary.days
            };
        } catch (e) {
            console.error("Failed to parse regenerated itinerary JSON", e);
            throw new Error("Failed to regenerate itinerary");
        }
    }
    throw new Error("Failed to regenerate itinerary");
};

export const generateDiningOptions = async (
    prompt: string,
    preferences?: { dietary?: string; luxury?: number }
): Promise<DiningRecommendation[]> => {

    const luxuryTierMap: { [key: number]: string } = {
        1: 'Street Food / Budget',
        2: 'Casual Dining / Economy',
        3: 'Upscale / Comfort',
        4: 'Fine Dining / Premium',
        5: 'Michelin Star / Ultra-Luxury'
    };

    const preferenceContext = preferences ? `
    STRICT USER PREFERENCES:
    ${preferences.dietary && preferences.dietary !== 'None' ? `- DIETARY: ${preferences.dietary}. (Filter ALL recommendations to strictly be ${preferences.dietary}).` : ''}
    ${preferences.luxury ? `- BUDGET TIER: ${luxuryTierMap[preferences.luxury]}.` : ''}
    ` : '';

    const responseSchema = {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                restaurantName: { type: "STRING" },
                cuisine: { type: "STRING" },
                dishName: { type: "STRING" },
                description: { type: "STRING" },
                price: { type: "STRING" },
                rating: { type: "STRING" },
                ambiance: { type: "STRING" }
            }
        }
    };

    const response = await callGeminiApi({
        contents: `
        ROLE: You are an elite Concierge.
        GOAL: Suggest 3 specific dining options/dishes based on search: "${prompt}".

        ${preferenceContext}

        OUTPUT: JSON Array only.
        `,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        try {
            return JSON.parse(cleanJson(response.candidates[0].content.parts[0].text)) as DiningRecommendation[];
        } catch (e) {
            console.error("Failed to parse dining JSON", e);
            throw new Error("Failed to parse dining options");
        }
    }
    throw new Error("Failed to generate dining options");
};

export interface TripAnalysis {
    isComplete: boolean;
    missingFields: string[];
    suggestions: {
        duration?: string[];
        budget?: string[];
        travelers?: string[];
        interests?: string[];
    };
    originalPrompt: string;
    extractedLocation?: string;
    extractedDuration?: string;
}

export const analyzeTripRequest = async (prompt: string): Promise<TripAnalysis> => {

    const responseSchema = {
        type: "OBJECT",
        properties: {
            isComplete: { type: "BOOLEAN" },
            extractedLocation: { type: "STRING", description: "The corrected, standardized title-case destination name (e.g. 'Mangalore')" },
            extractedDuration: { type: "STRING", description: "The standardized duration string (e.g. '5 Days')" },
            missingFields: { type: "ARRAY", items: { type: "STRING" } },
            suggestions: {
                type: "OBJECT",
                properties: {
                    duration: { type: "ARRAY", items: { type: "STRING" } },
                    budget: { type: "ARRAY", items: { type: "STRING" } },
                    travelers: { type: "ARRAY", items: { type: "STRING" } },
                    interests: { type: "ARRAY", items: { type: "STRING" } },
                    origin: { type: "ARRAY", items: { type: "STRING" } }
                }
            },
            originalPrompt: { type: "STRING" }
        }
    };

    try {
        const response = await callGeminiApi({
            contents: `Analyze this travel request: "${prompt}".
            
            1. Correct any typos in the destination name (e.g., "mangalre" -> "Mangalore", "bengalur" -> "Bengaluru").
            2. Standardize the duration (e.g., "weekend" -> "3 Days", "a week" -> "7 Days").
            3. Determine if critical information is missing.
            
            Critical fields are: 
            1. Origin (Where are you starting from?)
            2. Destination (Where?)
            3. Duration (How long?)
            4. Budget (Low, Medium, High?)
            5. Interests (Adventure, Food, Culture?)

            If missing, provide 3 specific options.

            Return JSON only.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
            const result = JSON.parse(cleanJson(response.candidates[0].content.parts[0].text));
            return { ...result, originalPrompt: prompt };
        }
    } catch (e) {
        console.error("Analysis Parse Error", e);
    }

    // Fallback if analysis fails (assume complete to unblock)
    return {
        isComplete: true,
        missingFields: [],
        suggestions: {},
        originalPrompt: prompt
    };
};
