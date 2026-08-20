export interface PlaceImage {
    imageUrl: string;
    photographer: string;
    photographerUrl: string;
}

const API_ENDPOINT = '/api/unsplash/search';

// Simple in-memory cache so we don't hit the API multiple times for the same place
const imageCache = new Map<string, PlaceImage | null>();

/**
 * Fetches an image for a specific place using the Unsplash backend proxy
 */
export const getPlaceImage = async (placeName: string, cityContext?: string): Promise<PlaceImage | null> => {
    if (!placeName) return null;

    // Enhance query for better results, prioritizing the city if provided
    const query = cityContext ? `${placeName} ${cityContext}` : placeName;
    const cacheKey = query.toLowerCase();

    if (imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey) || null;
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, city: cityContext })
        });

        if (!response.ok) {
            console.warn(`Failed to fetch image for ${query}: ${response.status}`);
            imageCache.set(cacheKey, null); // Cache the failure to prevent retries
            return null;
        }

        const data: PlaceImage = await response.json();
        imageCache.set(cacheKey, data);
        return data;

    } catch (error) {
        console.error(`Error fetching image for ${query}:`, error);
        imageCache.set(cacheKey, null);
        return null;
    }
};
