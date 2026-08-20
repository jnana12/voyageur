import React, { useEffect, useState } from 'react';

interface IntroLoaderProps {
    onComplete: () => void;
}

const IntroLoader: React.FC<IntroLoaderProps> = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [isZooming, setIsZooming] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const DURATION = 3500;
        const startTime = Date.now();
        let animationFrameId: number | null = null;
        let timeoutIds: NodeJS.Timeout[] = [];

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const rawProgress = Math.min(100, (elapsed / DURATION) * 100);

            setProgress(rawProgress);

            if (rawProgress < 100) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                const t1 = setTimeout(() => {
                    setIsZooming(true);
                    const t2 = setTimeout(() => {
                        setIsExiting(true);
                        const t3 = setTimeout(onComplete, 500);
                        timeoutIds.push(t3);
                    }, 1200);
                    timeoutIds.push(t2);
                }, 200);
                timeoutIds.push(t1);
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
            timeoutIds.forEach(clearTimeout);
        };
    }, [onComplete]);

    // Fill calculation
    const waveY = 4200 - (progress / 100) * 4700;

    return (
        <div className={`fixed inset-0 z-[10000] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>

            <div
                className={`relative w-[95vw] flex flex-col items-center justify-center translate-y-0 md:translate-y-[7vh] ${isZooming ? 'scale-[5] opacity-0' : 'scale-100'} will-change-transform`}
                style={{
                    transition: 'transform 1.2s cubic-bezier(0.8, 0, 0.2, 1), opacity 1.2s ease-in',
                }}
            >
                <svg viewBox="0 0 16000 4000" className="w-full h-auto overflow-visible font-sans font-bold">
                    <defs>
                        <mask id="liquidMask">
                            <g transform={`translate(0, ${waveY})`}>
                                <path
                                    d="M 0 0 
                                       Q 1000 600 2000 0      
                                       Q 3500 -800 5000 0    
                                       Q 6500 500 8000 0     
                                       Q 9000 -400 10000 0    
                                       Q 11500 700 13000 0    
                                       Q 14500 -600 16000 0  

                                       Q 17000 600 18000 0
                                       Q 19500 -800 21000 0
                                       Q 22500 500 24000 0
                                       Q 25000 -400 26000 0
                                       Q 27500 700 29000 0
                                       Q 30500 -600 32000 0

                                       V 15000 H 0 Z"
                                    fill="white"
                                    style={{ animationPlayState: isZooming ? 'paused' : 'running' }}
                                    className="animate-[waveScroll_5s_linear_infinite]"
                                />
                            </g>
                        </mask>
                    </defs>

                    {/* Background Text (Dark Grey) */}
                    <text
                        x="8000" y="2000"
                        dominantBaseline="middle" textAnchor="middle"
                        fontSize="3200"
                        fill="#27272a"
                        letterSpacing="-150"
                    >
                        VOYAGEUR
                    </text>

                    {/* Foreground Text (Cyan Liquid) */}
                    <text
                        x="8000" y="2000"
                        dominantBaseline="middle" textAnchor="middle"
                        fontSize="3200"
                        fill="#22d3ee"
                        letterSpacing="-150"
                        mask="url(#liquidMask)"
                    >
                        VOYAGEUR
                    </text>
                </svg>

                {/* Number Indicator */}
                <div
                    className="absolute bottom-[-5vw] right-4 transition-opacity duration-200"
                    style={{ opacity: isZooming ? 0 : 1 }}
                >
                    <span className="font-mono text-[2.5vw] text-white font-bold tabular-nums tracking-widest">
                        {Math.floor(progress).toString().padStart(3, '0')}
                    </span>
                    <span className="text-cyan-500 text-[1.5vw] ml-1">%</span>
                </div>

            </div>

            <style>{`
                @keyframes waveScroll {
                    /* Moves exactly one cycle width (16000) to the left */
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-16000px); } 
                }
            `}</style>
        </div>
    );
};

export default IntroLoader;