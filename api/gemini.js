import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API Key missing' });
    }

    const { prompt, contents: incomingContents, config, tools, systemInstruction } = req.body;

    let finalContents = incomingContents;
    if (typeof finalContents === 'string') {
        finalContents = [{ role: 'user', parts: [{ text: finalContents }] }];
    } else if (!finalContents && prompt) {
        finalContents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    if (!finalContents) {
        return res.status(400).json({ error: 'No contents provided' });
    }

    // Prepare system instruction if provided
    const systemInstructionPart = systemInstruction ? {
        role: "system",
        parts: [{ text: systemInstruction }]
    } : null;

    // Try a series of models and endpoints until one works
    const attempts = [
        { model: "gemini-2.5-flash", version: "v1beta" },
        { model: "gemini-2.0-flash", version: "v1beta" },
        { model: "gemini-flash-latest", version: "v1beta" }
    ];

    let errors = [];

    for (const attempt of attempts) {
        try {
            console.log(`[api/gemini] Trying ${attempt.model} (${attempt.version})...`);

            const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`;

            // Prepare the final body with correct REST formatting
            // Mapping specific keys rather than generic recursion to avoid messing with schema property names
            const mapTools = (toolsArray) => {
                if (!toolsArray) return undefined;
                return toolsArray.map(tool => {
                    if (tool.googleSearchRetrieval) {
                        return {
                            google_search_retrieval: {
                                dynamic_retrieval_config: {
                                    mode: tool.googleSearchRetrieval.dynamicRetrievalConfig?.mode || "MODE_DYNAMIC",
                                    dynamic_threshold: tool.googleSearchRetrieval.dynamicRetrievalConfig?.dynamicThreshold || 0.1
                                }
                            }
                        };
                    }
                    return tool;
                });
            };

            const payload = {
                contents: finalContents,
                generation_config: {
                    temperature: config?.temperature,
                    top_p: config?.topP,
                    top_k: config?.topK,
                    max_output_tokens: config?.maxOutputTokens,
                    stop_sequences: config?.stopSequences,
                    response_mime_type: config?.responseMimeType,
                    response_schema: config?.responseSchema
                }
            };

            // Map Top-Level REST fields
            if (systemInstructionPart) {
                payload.system_instruction = systemInstructionPart;
            }

            if (tools) {
                console.log('[api/gemini] Tools received:', JSON.stringify(tools));
                payload.tools = mapTools(tools);
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`[api/gemini] SUCCESS: ${attempt.model} (${attempt.version})`);
                return res.status(200).json(data);
            }

            const errorMsg = data.error?.message || response.statusText;
            const statusCode = response.status;

            console.warn(`[api/gemini] ${attempt.model} (${attempt.version}) failed (${statusCode}): ${errorMsg}`);

            // If it's a 429 (Quota), DON'T retry other models as they likely share the same quota
            if (statusCode === 429) {
                return res.status(429).json({
                    error: 'Gemini API Quota Exceeded',
                    details: errorMsg,
                    tip: "Slow down! You've reached the free tier limits (15 RPM). Please wait a few seconds and try again."
                });
            }

            errors.push(`${attempt.model}: ${errorMsg}`);

        } catch (err) {
            console.error(`[api/gemini] Request error:`, err.message);
            errors.push(`${attempt.model}: ${err.message}`);
        }
    }

    return res.status(500).json({
        error: 'All Gemini attempts failed',
        details: errors,
        tip: "Ensure your GEMINI_API_KEY is valid and has access to Gemini 1.5 Flash in Google AI Studio."
    });
}
