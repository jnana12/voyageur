import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import geminiHandler from './gemini.js';
import unsplashHandler from './unsplash.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(express.json());

// Main Gemini Endpoint
app.post('/api/gemini', async (req, res) => {
    try {
        await geminiHandler(req, res);
    } catch (error) {
        console.error('Server Handler Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unsplash Image Search Endpoint
app.post('/api/unsplash/search', async (req, res) => {
    try {
        await unsplashHandler(req, res);
    } catch (error) {
        console.error('Unsplash Server Handler Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Suppress Chrome DevTools 404/CSP error
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).send(); // Send No Content smoothly
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`Rocket Local Backend Server running at http://localhost:${port}`);
});
