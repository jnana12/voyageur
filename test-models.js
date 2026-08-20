import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function getModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
        console.log("AVAILABLE MODELS:");
        data.models.forEach(m => console.log(m.name, "-", m.supportedGenerationMethods.join(', ')));
    } else {
        console.log("ERROR FETCHING MODELS:", JSON.stringify(data, null, 2));
    }
}

getModels();
