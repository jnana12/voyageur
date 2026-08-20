import React from 'react';
import { useScramble } from '../../hooks/useScramble';

interface ScrambleTextProps {
    text: string;
    speed?: number;
    className?: string;
    delay?: number;
}

export const ScrambleText: React.FC<ScrambleTextProps> = ({ text, speed = 40, className = '', delay = 0 }) => {
    const scrambled = useScramble(text, speed);

    // Optional: Add mounting delay support if needed, but hook handles basic scrambling
    return <span className={className}>{scrambled}</span>;
};
