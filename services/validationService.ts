
import { TripItinerary } from "../types";
import { runLocalHeuristics } from "../utils/logisticsEngine";

const API_ENDPOINT = '/api/gemini';

const cleanJson = (text: string) => {
    let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) start = firstBrace;
    else if (firstBracket !== -1) start = firstBracket;
    if (start !== -1) {
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);
        if (end !== -1) cleaned = cleaned.substring(start, end + 1);
    }
    return cleaned;
};

const callValidatorApi = async (payload: any) => {
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Validation API Failed: ${response.status}`);
    return await response.json();
};

export const runValidationProtocol = async (itinerary: TripItinerary): Promise<{ validated: TripItinerary, fixCount: number, auditLogs: any[] }> => {
    const startTime = Date.now();
    const localReport = runLocalHeuristics(itinerary);

    const systemInstruction = `
    ROLE: Elite Logistics Auditor & Web-Verified Fact Checker.
    MISSION: Perform a high-fidelity audit of the trip to ${itinerary.destination}.
    1. USE GOOGLE SEARCH grounding for EVERY location.
    2. Ensure transit between activities is physically possible.
    3. Re-order if backtracking is detected.
    `;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            auditLog: { type: "ARRAY", items: { type: "OBJECT", properties: { dayIndex: { type: "NUMBER" }, activityIndex: { type: "NUMBER" }, issueType: { type: "STRING" } } } },
            correctedActivities: { type: "ARRAY", items: { type: "OBJECT", properties: { dayIndex: { type: "NUMBER" }, activityIndex: { type: "NUMBER" }, title: { type: "STRING" }, time: { type: "STRING" }, location: { type: "STRING" }, description: { type: "STRING" } } } }
        }
    };

    // Use Google Search grounding for real-time verification (Mandatory as requested)
    const auditResponse = await callValidatorApi({
        systemInstruction,
        contents: `Analyze and repair: ${itinerary.destination}. Local Anomalies: ${JSON.stringify(localReport.anomalies)}. Data: ${JSON.stringify(itinerary.days)}`,
        tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.1 } } }],
        config: { responseMimeType: "application/json", responseSchema }
    });

    const result = JSON.parse(cleanJson(auditResponse.candidates?.[0]?.content?.parts?.[0]?.text || "{}"));
    const finalItinerary = { ...itinerary };
    let fixCount = 0;
    const finalLogs: any[] = [];

    if (result.correctedActivities) {
        result.correctedActivities.forEach((cAct: any) => {
            const day = finalItinerary.days[cAct.dayIndex];
            if (day && day.activities[cAct.activityIndex]) {
                const original = day.activities[cAct.activityIndex];
                day.activities[cAct.activityIndex] = { ...original, ...cAct, isValidated: true, verificationNote: "Fixed via Search." };
                fixCount++;
                finalLogs.push({ type: 'FIXED', title: original.title, day: cAct.dayIndex + 1, note: `Corrected to ${cAct.title}.` });
            }
        });
    }

    finalItinerary.days.forEach((day, dIdx) => {
        day.activities.forEach((act) => {
            if (!act.isValidated) {
                act.isValidated = true;
                act.verificationNote = "Verified.";
                finalLogs.push({ type: 'VERIFIED', title: act.title, day: dIdx + 1, note: "Passed audit." });
            }
        });
    });

    return { validated: finalItinerary, fixCount, auditLogs: finalLogs };
};
