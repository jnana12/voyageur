import React from 'react';

// TacticalBackground from TripPlanner - creates the futuristic grid/HUD effect
const TacticalBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Ambient Glow - Simplified for mobile */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-cyan-900/20 blur-[80px] md:blur-[120px] rounded-full mix-blend-screen" />

        {/* 3D Grid Floor - DESKTOP ONLY */}
        <div
            className="hidden md:block absolute inset-0 opacity-30"
            style={{
                backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
                transform: 'perspective(1000px) rotateX(60deg) translateY(200px) scale(2)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)'
            }}
        />

        {/* HUD Circles - Simplified animation on mobile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] border border-cyan-500/5 rounded-full animate-[spin_120s_linear_infinite] md:animate-[spin_120s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] border border-dashed border-cyan-500/10 rounded-full animate-[spin_60s_linear_infinite_reverse] md:animate-[spin_60s_linear_infinite_reverse]" />
    </div>
);

interface PageWrapperProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * PageWrapper - Unified page container matching TripPlanner visual style
 * Includes TacticalBackground, proper container sizing, and consistent padding.
 */
export const PageWrapper: React.FC<PageWrapperProps> = ({ children, className = '' }) => {
    return (
        <div className={`min-h-screen relative overflow-hidden bg-black selection:bg-cyan-500/30 ${className}`}>
            <TacticalBackground />
            <div className="relative z-10 pt-32 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
                {children}
            </div>
        </div>
    );
};

export default PageWrapper;
