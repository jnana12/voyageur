import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const originalFetch = global.fetch;
global.fetch = async (...args) => {
    console.log("SDK FETCH URL:", args[0].replace(process.env.GEMINI_API_KEY, "[KEY]"));
    console.log("SDK Payload:", args[1].body);
    return originalFetch(...args);
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function test() {
    try {
        const result = await model.generateContent("Hello");
        console.log(result.response.text());
    } catch (e) {
        console.error(e);
    }
}
test();
