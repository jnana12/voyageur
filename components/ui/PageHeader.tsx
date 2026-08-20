import React from 'react';

interface PageHeaderProps {
    badge: string;
    title: string;
    highlight?: string;
    description: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ badge, title, highlight, description }) => {
    return (
        <div className="text-center mb-16 relative">
            {/* Ambient Glow behind badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-1 bg-cyan-500/20 blur-xl" />
            
            {/* Tactical Badge - Exact match to TripPlanner */}
            <span className="relative inline-block py-1 mb-6 text-xs font-bold tracking-[0.4em] text-cyan-400 uppercase bg-black border border-cyan-500/50 px-6 font-mono shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                {badge}
            </span>
            
            {/* H1 Title - Exact size and tracking match */}
            <h1 className="mb-4 font-sans text-5xl md:text-7xl font-bold tracking-tighter text-white uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                {title} {highlight && (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 animate-shimmer bg-[length:200%_100%]">
                        {highlight}
                    </span>
                )}
            </h1>
            
            {/* Description - Exact mono styling */}
            <p className="max-w-xl mx-auto font-mono text-xs text-zinc-500 tracking-wider uppercase">
                {description}
            </p>
        </div>
    );
};
