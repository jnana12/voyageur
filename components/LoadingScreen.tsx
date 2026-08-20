
import React, { useState, useEffect, useRef } from 'react';

const LoadingScreen: React.FC = () => {
    const BAR_COUNT = 6;
    const [heights, setHeights] = useState<number[]>(new Array(BAR_COUNT).fill(10));

    const timeRef = useRef<number>(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const animate = () => {
            timeRef.current += 0.15;

            const newHeights = new Array(BAR_COUNT).fill(0).map((_, i) => {
                const offset = i * 0.5;
                const beat = Math.sin(timeRef.current * 1.5) * 40;
                const ripple = Math.cos(timeRef.current * 3 + offset) * 15;
                const centerDampening = 1 - (i / BAR_COUNT) * 0.5;

                let h = 20 + (beat + ripple + 30) * centerDampening;
                h += Math.random() * 5;

                return Math.max(5, Math.min(100, h));
            });

            setHeights(newHeights);
            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, []);

    const leftSide = [...heights].slice(1).reverse();
    const bars = [...leftSide, ...heights];

    return (
        <div 
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden cursor-wait font-sans select-none perspective-[1000px]"
            role="status"
            aria-live="polite"
            aria-label="Loading, please wait"
        >
            <div className="relative transform-style-3d rotate-x-12 scale-125">
                <div className="flex items-end gap-1.5 h-32">
                    {bars.map((h, i) => (
                        <div
                            key={i}
                            className="w-3 rounded-t-sm bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6)]"
                            style={{
                                height: `${h}%`,
                                opacity: Math.max(0.3, h / 100)
                            }}
                        />
                    ))}
                </div>
                <div className="flex items-start gap-1.5 h-32 transform scale-y-[-1] opacity-40 mask-gradient mt-1">
                    {bars.map((h, i) => (
                        <div
                            key={`ref-${i}`}
                            className="w-3 rounded-t-sm bg-cyan-600/50"
                            style={{ height: `${h}%` }}
                        />
                    ))}
                </div>
            </div>
            <div className="absolute bottom-20 flex flex-col items-center gap-2 animate-pulse">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.5em] drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                    Processing
                </div>
            </div>
            <style>{`
                .transform-style-3d {
                    transform-style: preserve-3d;
                    transform: perspective(800px) rotateX(25deg);
                }
                .mask-gradient {
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
