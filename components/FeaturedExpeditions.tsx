import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FEATURED_TRIPS } from '../data/featuredTrips';
import { ArrowRight, Globe, Clock, CreditCard, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { TripItinerary, StoredTrip } from '../types';
import { useInView } from '../hooks/useInView';

export interface Trip {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    color: string;
    itinerary: TripItinerary;
}

const COLOR_CLASSES: Record<string, {
    bgGradient: string;
    text400: string;
    text300: string;
    buttonBg: string;
    buttonBorder: string;
    buttonHoverBg: string;
    buttonHoverBorder: string;
}> = {
    cyan: {
        bgGradient: "from-cyan-500/10",
        text400: "text-cyan-400",
        text300: "text-cyan-300",
        buttonBg: "bg-cyan-500/20",
        buttonBorder: "border-cyan-500/50",
        buttonHoverBg: "hover:bg-cyan-500",
        buttonHoverBorder: "hover:border-cyan-400"
    },
    emerald: {
        bgGradient: "from-emerald-500/10",
        text400: "text-emerald-400",
        text300: "text-emerald-300",
        buttonBg: "bg-emerald-500/20",
        buttonBorder: "border-emerald-500/50",
        buttonHoverBg: "hover:bg-emerald-500",
        buttonHoverBorder: "hover:border-emerald-400"
    },
    orange: {
        bgGradient: "from-orange-500/10",
        text400: "text-orange-400",
        text300: "text-orange-300",
        buttonBg: "bg-orange-500/20",
        buttonBorder: "border-orange-500/50",
        buttonHoverBg: "hover:bg-orange-500",
        buttonHoverBorder: "hover:border-orange-400"
    }
};

interface FeaturedExpeditionsProps {
    onSelectTrip: (trip: StoredTrip) => void;
}

const FeaturedExpeditions: React.FC<FeaturedExpeditionsProps> = ({ onSelectTrip }) => {
    // Scroll Animation Logic
    const [inViewRef, inView] = useInView({ threshold: 0.1, triggerOnce: true });

    // State for Mobile Detection (Ensures re-render on hydration/resize)
    const [isMobile, setIsMobile] = useState(false);

    // State for Scroll/Lazy Loading (Instagram Method)
    const [activeIndex, setActiveIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    // Cache card width for performance
    const cardWidthRef = useRef(0);
    const scrollFrameRef = useRef(0);

    // Initial Mobile Check & Resize Listener
    // Initial Mobile Check & Resize Listener
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            cardWidthRef.current = window.innerWidth * 0.85;
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Combine inView logic: Always true on mobile to fix "Blank Screen"
    const isInView = isMobile ? true : inView;

    // Track Scroll Position for Lazy Loading
    const handleScroll = useCallback(() => {
        if (!containerRef.current || !isMobile) return;

        // Throttle with rAF
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const scrollLeft = containerRef.current.scrollLeft;
            const width = cardWidthRef.current || (window.innerWidth * 0.85);

            const newIndex = Math.round(scrollLeft / width);

            setActiveIndex(prev => (prev === newIndex ? prev : newIndex));
        });
    }, [isMobile]);

    const state = useRef({
        isDragging: false,
        isMoving: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        targetX: 0,
        lastMouseX: 0,
        velocity: 0,
        dragDistance: 0,
        directionLocked: false,
        animationId: 0
    });

    const applyMomentum = useCallback(() => {
        const slider = sliderRef.current;
        const container = containerRef.current;
        // STOP momentum loop if on mobile
        if (!slider || !container || state.current.isDragging || isMobile) return;

        state.current.velocity *= 0.80;
        state.current.targetX += state.current.velocity;

        const minX = -(slider.scrollWidth - container.clientWidth + 40);
        const maxX = 0;
        if (state.current.targetX > maxX) state.current.targetX = maxX;
        if (state.current.targetX < minX) state.current.targetX = minX;

        const tension = 0.03;
        state.current.currentX += (state.current.targetX - state.current.currentX) * tension;

        const roundedX = Math.round(state.current.currentX * 100) / 100;
        // Only apply transform if NOT mobile
        if (!isMobile) {
            slider.style.transform = `translate3d(${roundedX}px, 0, 0)`;
        }

        if (Math.abs(state.current.velocity) > 0.1 || Math.abs(state.current.targetX - state.current.currentX) > 0.1) {
            state.current.animationId = requestAnimationFrame(applyMomentum);
        }
    }, [isMobile]);

    useEffect(() => {
        const slider = sliderRef.current;
        const container = containerRef.current;
        if (!slider || !container) return;

        // --- PERFORMANCE CRITICAL --- 
        // If mobile, do NOT attach pointer events. Rely on native CSS scroll.
        if (isMobile) {
            slider.style.transform = 'none'; // Ensure no residual transforms
            return;
        }

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            state.current.isDragging = true;
            state.current.isMoving = false;
            state.current.directionLocked = false;
            state.current.startX = e.clientX;
            state.current.startY = e.clientY;
            state.current.lastMouseX = e.clientX;
            state.current.velocity = 0;
            state.current.dragDistance = 0; // Reset drag distance
            cancelAnimationFrame(state.current.animationId);
            slider.style.transition = 'none';
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!state.current.isDragging) return;
            // Desktop logic only...
            const x = e.clientX;
            const deltaX = x - state.current.lastMouseX;
            state.current.directionLocked = true; // Assume locked on desktop mouse drag

            const dragSensitivity = 0.6; // Reduced from 1.0 for finer control
            state.current.dragDistance += Math.abs(deltaX); // Track distance to differentiate drag vs click
            state.current.targetX += deltaX * dragSensitivity;
            state.current.velocity = deltaX * dragSensitivity;
            state.current.lastMouseX = x;
            state.current.currentX = state.current.targetX;

            const roundedX = Math.round(state.current.currentX * 100) / 100;
            slider.style.transform = `translate3d(${roundedX}px, 0, 0)`;
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!state.current.isDragging) return;
            state.current.isDragging = false;
            if (state.current.directionLocked) {
                slider.releasePointerCapture(e.pointerId);
                state.current.animationId = requestAnimationFrame(applyMomentum);
            }
        };

        slider.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        slider.addEventListener('pointercancel', onPointerUp);

        return () => {
            slider.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            slider.removeEventListener('pointercancel', onPointerUp);
            cancelAnimationFrame(state.current.animationId);
        };
    }, [applyMomentum, isMobile]);

    // Simple scroll handler for buttons (Desktop only)
    const scroll = (direction: 'left' | 'right') => {
        if (!sliderRef.current || !containerRef.current) return;
        const step = containerRef.current.clientWidth * 0.5;
        state.current.targetX += (direction === 'left' ? step : -step);
        cancelAnimationFrame(state.current.animationId);
        state.current.animationId = requestAnimationFrame(applyMomentum);
    };

    // Stable callback
    const handleSelectTrip = useCallback((t: any) => {
        onSelectTrip(t);
    }, [onSelectTrip]);

    return (
        <div ref={inViewRef} className="relative z-10 w-full overflow-hidden">
            <div className={`flex items-center justify-between mb-6 md:mb-10 pl-1 transition-all duration-1000 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tighter drop-shadow-xl">
                        Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Expeditions</span>
                    </h2>
                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.3em] mt-2">
                        <span className="md:hidden">Swipe to explore</span>
                        <span className="hidden md:inline">Drag to explore</span>
                    </p>
                </div>

                <div className="hidden md:flex gap-3 pr-4">
                    <button onClick={() => scroll('left')} className="p-3 rounded-full border border-white/10 bg-black/40 text-white hover:bg-cyan-400 hover:text-black transition-all active:scale-95">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={() => scroll('right')} className="p-3 rounded-full border border-white/10 bg-black/40 text-white hover:bg-cyan-400 hover:text-black transition-all active:scale-95">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* MOBILE OPTIMIZATION:
                1. overflow-x-auto: Enables native scrolling
                2. snap-x snap-mandatory: Enables native CSS snapping
                3. hide-scrollbar: Aesthetics
            */}
            <div
                ref={containerRef}
                className="w-full relative overflow-x-auto md:overflow-hidden snap-x snap-mandatory hide-scrollbar touch-auto overscroll-x-contain"
                onScroll={handleScroll}
                onClickCapture={(e) => {
                    // Prevent click events if we've dragged more than 5px
                    if (!isMobile && state.current.dragDistance > 5) {
                        e.stopPropagation();
                    }
                }}
            >
                <div
                    ref={sliderRef}
                    className="flex gap-4 md:gap-6 pb-8 px-4 md:px-0 md:cursor-grab active:cursor-grabbing w-max md:w-auto"
                    style={{
                        // Remove transform on mobile to allow native scroll
                        transform: 'none',
                        perspective: '1000px',
                    }}
                >
                    {FEATURED_TRIPS.map((trip, idx) => (
                        <div
                            key={trip.id}
                            className="snap-center shrink-0 snap-always [scroll-snap-stop:always]" // FORCE STOP: Prevents flinging, ensures rendering
                        >
                            <div
                                className={`w-[85vw] md:w-[380px] md:transition-all md:duration-700 md:ease-out`} // Fixed width for reliable layout
                                style={{
                                    opacity: 1, // Force opaque on mobile
                                    transform: isInView ? 'translate3d(0, 0, 0)' : 'translate3d(0, 40px, 0) scale(0.95)',
                                    // Remove delay on mobile to prevent "pop-in" effect
                                    transitionDelay: isMobile ? '0s' : `${idx * 100}ms`,
                                }}
                            >
                                <FeaturedCard
                                    trip={trip as Trip}
                                    index={idx}
                                    onSelect={handleSelectTrip}
                                    // INSTAGRAM LOGIC: Load only if adjacent to active index
                                    // Load current, prev, and next 2 (buffer)
                                    forceLoad={isMobile ? (Math.abs(activeIndex - idx) <= 2) : true}
                                />
                            </div>
                        </div>
                    ))}
                    {/* Padding for end of scroll list */}
                    <div className="w-4 md:w-24 shrink-0 h-1" />
                </div>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .clip-corner { clip-path: polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%); }
                @keyframes holographic-scan { 0% { top: -100%; } 100% { top: 200%; } }
                .animate-holographic-scan { animation: holographic-scan 3s linear infinite; }
            `}</style>
        </div>
    );
};

// MEMOIZED CARD TO PREVENT RE-RENDERS ON SCROLL
const FeaturedCard = React.memo(({ trip, index, onSelect, forceLoad = true }: { trip: Trip, index: number, onSelect: (t: any) => void, forceLoad?: boolean }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const colors = COLOR_CLASSES[trip.color] || COLOR_CLASSES.cyan;

    // Mobile check to prevent expensive tilt calculations
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isMobile || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        // Reduce rotation slightly for smoother FPS
        cardRef.current.style.transform = `perspective(1000px) rotateX(${y * -3}deg) rotateY(${x * 3}deg) scale(1.02)`;
    };

    const handlePointerLeave = () => {
        if (isMobile || !cardRef.current) return;
        cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
    };

    const handleSelect = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const tripWrapper = {
            id: crypto.randomUUID(),
            user_id: '',
            destination: trip.itinerary.destination,
            total_cost: trip.itinerary.totalEstimatedCost,
            duration: trip.itinerary.duration,
            status: 'draft',
            data: trip.itinerary,
            created_at: Date.now(),
            updated_at: Date.now()
        };
        onSelect(tripWrapper);
    };

    return (
        <div
            ref={cardRef}
            className={`group relative h-[400px] md:h-[440px] cursor-pointer transition-transform duration-500 ease-out select-none ${isMobile ? '' : 'will-change-transform'}`}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onClick={handleSelect}
            // Optimization: Remove contentVisibility on memoized card to prevent paint flashing during fast scroll
            style={isMobile ? { containIntrinsicSize: '400px' } : undefined}
        >
            <div className={`absolute inset-0 bg-zinc-900 rounded-sm overflow-hidden clip-corner border border-white/5 transition-all duration-500 ease-out md:group-hover:border-cyan-500/50 md:group-hover:shadow-[0_0_40px_rgba(34,211,238,0.25)] ${!forceLoad ? 'animate-pulse' : ''}`}>
                {forceLoad ? (
                    <img
                        src={trip.image}
                        alt={trip.title}
                        // IMPORTANT: sizes attribute tells mobile to download smaller version if available
                        sizes="(max-width: 768px) 300px, 400px"
                        loading="eager" // Force eager load to prevent white flashes on scroll
                        decoding="sync" // Sync decoding for instant visibility
                        className="w-full h-full object-cover transition-transform duration-700 ease-out md:group-hover:scale-110 opacity-60 md:group-hover:opacity-100 grayscale md:group-hover:grayscale-0"
                    />
                ) : (
                    // Placeholder when not loaded (adjacent lazy load)
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/10 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Remove holographic scan on mobile entirely to save GPU */}
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 hidden md:block">
                    <div className="absolute w-full h-[100px] bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent skew-y-12 animate-holographic-scan" />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />

                {/* Disable heavy mix-blend-overlay on mobile */}
                <div className={`hidden md:block absolute inset-0 bg-gradient-to-b ${colors.bgGradient} to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-500 mix-blend-overlay`} />
            </div>

            <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-between z-10 pointer-events-none" style={{ transform: isMobile ? 'none' : 'translateZ(30px)' }}>
                {/* Header Content */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 bg-black/80 border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest ${colors.text400}`}>
                            SEQ_0{index + 1}
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <div className="relative">
                    <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-1">
                        {trip.title}
                    </h3>
                    <div className={`text-xs md:text-sm font-mono font-bold ${colors.text400} mb-3 tracking-[0.2em] uppercase flex items-center gap-2`}>
                        <MapPin className="w-3 h-3" /> {trip.subtitle}
                    </div>

                    {/* Show grid always on mobile, opacity transition only on desktop */}
                    <div className="grid grid-cols-2 gap-2 mb-4 opacity-100 md:opacity-80 md:group-hover:opacity-100 transition-all duration-300">
                        <div className="flex items-center gap-2 text-xs text-white font-mono font-bold">
                            <Clock className="w-3 h-3 text-cyan-500" />
                            {trip.itinerary.duration}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white font-mono font-bold">
                            <CreditCard className="w-3 h-3 text-emerald-500" />
                            {trip.itinerary.totalEstimatedCost}
                        </div>
                    </div>

                    {/* Button always visible on mobile, reveals on hover on desktop */}
                    <div className="mt-4 pt-4 border-t border-white/10 opacity-100 translate-y-0 md:opacity-0 md:group-hover:opacity-100 md:translate-y-4 md:group-hover:translate-y-0 transition-all duration-500 pointer-events-auto">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleSelect(e); }}
                            className={`w-full py-3 ${colors.buttonBg} border ${colors.buttonBorder} md:${colors.buttonHoverBg} md:hover:text-black md:${colors.buttonHoverBorder} ${colors.text300} uppercase font-bold tracking-widest text-xs transition-all flex items-center justify-center gap-2`}
                        >
                            Initialize Mission
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default FeaturedExpeditions;
