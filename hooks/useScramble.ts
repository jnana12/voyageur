
import { useState, useEffect, useRef } from 'react';

const ALPHA_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&";
const NUM_CHARS = "0123456789";

export const useScramble = (text: string, speed: number = 40, active: boolean = true) => {
    const [scrambledText, setScrambledText] = useState(text);
    const frameRef = useRef<number>(0);
    const iterationRef = useRef(0);
    const lastUpdateRef = useRef(0);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    // On mobile, update less frequently (every 3rd frame approx) to save CPU
    const UPDATE_INTERVAL = isMobile ? 50 : speed;

    useEffect(() => {
        if (!active) {
            setScrambledText(text);
            return;
        }

        // Reset
        iterationRef.current = 0;
        lastUpdateRef.current = Date.now();
        if (frameRef.current) cancelAnimationFrame(frameRef.current);

        const animate = () => {
            const now = Date.now();
            const delta = now - lastUpdateRef.current;

            if (delta > UPDATE_INTERVAL) {
                lastUpdateRef.current = now;

                setScrambledText(() => {
                    const result = text
                        .split("")
                        .map((char, index) => {
                            if (index < iterationRef.current) {
                                return text[index];
                            }
                            const originalChar = text[index];
                            if (/\d/.test(originalChar)) {
                                return NUM_CHARS[Math.floor(Math.random() * NUM_CHARS.length)];
                            } else if (/[a-zA-Z]/.test(originalChar)) {
                                return ALPHA_CHARS[Math.floor(Math.random() * ALPHA_CHARS.length)];
                            } else {
                                return originalChar; // Preserve spaces and symbols that aren't letters or numbers
                            }
                        })
                        .join("");

                    // Increment iteration
                    // On mobile, increment faster per frame since we update less often, to keep same absolute duration
                    iterationRef.current += isMobile ? 1 : (1 / 3);

                    return result;
                });
            }

            if (iterationRef.current < text.length) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [text, speed, active, isMobile]);

    return scrambledText;
};
