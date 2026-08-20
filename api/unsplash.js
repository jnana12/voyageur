import dotenv from 'dotenv';

dotenv.config();

const UNSPLASH_ACCESS_KEY = process.env.VITE_UNSPLASH_ACCESS_KEY || '';

export default async function unsplashHandler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!UNSPLASH_ACCESS_KEY) {
        return res.status(500).json({ error: 'Unsplash API key not configured on server' });
    }

    try {
        const { query, city } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const fetchImage = async (searchQuery) => {
            const url = `https://api.unsplash.com/search/photos?page=1&per_page=1&query=${encodeURIComponent(searchQuery)}&orientation=landscape`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
                    'Accept-Version': 'v1'
                }
            });

            if (!response.ok) {
                console.error(`Status from Unsplash: ${response.status}`, await response.text());
                if (response.status === 403 || response.status === 429) {
                    throw new Error("RATE_LIMIT");
                }
                throw new Error(`API_ERROR: ${response.status}`);
            }

            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return {
                    imageUrl: data.results[0].urls.regular,
                    photographer: data.results[0].user.name,
                    photographerUrl: data.results[0].user.links.html
                };
            }
            return null;
        };

        // Attempt 1: Highly specific query (e.g. "Dinner at Gajalee Seafood Mangalore")
        let result = await fetchImage(query);

        // Attempt 2: A slightly broader query (e.g. "Gajalee Seafood Mangalore")
        // Try removing generic verb words if present to help unsplash find it
        if (!result) {
            const cleanedQuery = query.replace(/^(Dinner at|Lunch at|Breakfast at|Explore|Visit|Check-in to|Arrival in|Depart from|Go to)\s+/i, '');
            if (cleanedQuery !== query) {
                result = await fetchImage(cleanedQuery);
            }
        }

        // Attempt 3: Ultimate Fallback query (Just the city, e.g. "Mangalore")
        if (!result && city) {
            result = await fetchImage(`${city} landmarks`);

            if (!result) {
                result = await fetchImage(city);
            }
        }

        if (result) {
            return res.status(200).json(result);
        } else {
            // Still nothing found? It's fine, we return 404 so the frontend knows to gracefully fall back without breaking.
            return res.status(404).json({ error: "No image found for this location" });
        }

    } catch (error) {
        if (error.message === "RATE_LIMIT") {
            return res.status(429).json({ error: "Rate limit exceeded." });
        }
        console.error('Unsplash Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
