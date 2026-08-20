import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from 'fs';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

const listModels = async () => {
    console.log("🔍 Checking available models for provided API Key...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ List Models Failed: ${response.status} - ${response.statusText}`);
            console.error(JSON.stringify(data, null, 2));
            return;
        }

        console.log("✅ Models fetched.");
        fs.writeFileSync('models.json', JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("❌ Request Error:", e);
    }
};

listModels();
