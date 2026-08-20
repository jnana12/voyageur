import React, { useState, useEffect, useRef } from 'react';
import { Shuffle, ArrowLeft, Zap, Terminal } from 'lucide-react';

// ============================================
// CURATED DESTINATION LIST
// ============================================

const SURPRISE_DESTINATIONS = [
    { name: 'Coorg', tagline: 'Scotland of India' },
    { name: 'Mysore', tagline: 'City of Palaces' },
    { name: 'Ooty', tagline: 'Queen of Hills' },
    { name: 'Hampi', tagline: 'Ancient Ruins' },
    { name: 'Pondicherry', tagline: 'French Riviera' },
    { name: 'Gokarna', tagline: 'Beach Paradise' },
    { name: 'Wayanad', tagline: 'Green Paradise' },
    { name: 'Chikmagalur', tagline: 'Coffee Country' },
    { name: 'Kodaikanal', tagline: 'Princess of Hills' },
    { name: 'Munnar', tagline: 'Tea Gardens' },
    { name: 'Goa', tagline: 'Beach & Party' },
    { name: 'Jaipur', tagline: 'Pink City' },
    { name: 'Udaipur', tagline: 'City of Lakes' },
    { name: 'Varanasi', tagline: 'Spiritual Capital' },
    { name: 'Kochi', tagline: 'Queen of Arabian Sea' },
    { name: 'Jaisalmer', tagline: 'Golden City' },
    { name: 'Darjeeling', tagline: 'Tea & Himalayas' },
    { name: 'Rishikesh', tagline: 'Yoga Capital' },
    { name: 'Amritsar', tagline: 'Golden Temple' },
    { name: 'Andaman', tagline: 'Island Escape' },
    { name: 'Leh', tagline: 'Land of Passes' },
    { name: 'Shimla', tagline: 'Hill Station' },
    { name: 'Manali', tagline: 'Mountain Magic' },
    { name: 'Agra', tagline: 'Taj Mahal' },
    { name: 'Alleppey', tagline: 'Backwaters' },
];

// ============================================
// COMPONENT PROPS
// ============================================

interface SurpriseMeProps {
    onDestinationSelected: (destination: string, prompt: string) => void;
    onCancel: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

const SurpriseMe: React.FC<SurpriseMeProps> = ({ onDestinationSelected, onCancel }) => {
    const [phase, setPhase] = useState<'ready' | 'spinning' | 'locked'>('ready');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lockedDestination, setLockedDestination] = useState<typeof SURPRISE_DESTINATIONS[0] | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Get visible destinations for the 3-slot reel
    const getVisibleDestinations = (index: number) => {
        const len = SURPRISE_DESTINATIONS.length;
        return {
            prev: SURPRISE_DESTINATIONS[(index - 1 + len) % len],
            current: SURPRISE_DESTINATIONS[index],
            next: SURPRISE_DESTINATIONS[(index + 1) % len],
        };
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        };
    }, []);

    // Start the slot machine spin
    const startSpin = () => {
        setPhase('spinning');

        // 1. Pre-calculate the result immediately
        const finalIndex = Math.floor(Math.random() * SURPRISE_DESTINATIONS.length);
        const targetDest = SURPRISE_DESTINATIONS[finalIndex];

        // 2. Define Base Sequence
        const spinSequence = [
            { interval: 100, count: 18 },   // Fast
            { interval: 150, count: 12 },   // Medium-fast
            { interval: 220, count: 8 },    // Medium
            { interval: 320, count: 5 },    // Slow
            { interval: 500, count: 3 },    // Very slow
            { interval: 800, count: 2 },    // Almost stopping
        ];

        // 3. Calculate steps needed to land exactly on target
        // Current visual index is currentIndex.
        // We need final visual index to be finalIndex.
        const totalBaseSteps = spinSequence.reduce((acc, phase) => acc + phase.count, 0);
        const distance = (finalIndex - currentIndex + SURPRISE_DESTINATIONS.length) % SURPRISE_DESTINATIONS.length;

        // We need (totalBaseSteps + extraSteps) % Length === distance
        const currentMod = totalBaseSteps % SURPRISE_DESTINATIONS.length;
        const extraSteps = (distance - currentMod + SURPRISE_DESTINATIONS.length) % SURPRISE_DESTINATIONS.length;

        // 4. Inject extra steps into the fastest phase (first one)
        spinSequence[0].count += extraSteps;

        let currentPhaseIndex = 0;
        let phaseSpinCount = 0;

        const spin = () => {
            // Trigger transition
            setIsTransitioning(true);

            // Update index visually
            setTimeout(() => {
                setCurrentIndex(prev => (prev + 1) % SURPRISE_DESTINATIONS.length);
                setIsTransitioning(false);
            }, spinSequence[currentPhaseIndex].interval * 0.65);

            phaseSpinCount++;

            // Check phase completion
            if (phaseSpinCount >= spinSequence[currentPhaseIndex].count) {
                currentPhaseIndex++;
                phaseSpinCount = 0;

                // End of all phases
                if (currentPhaseIndex >= spinSequence.length) {
                    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);

                    // Final Lock-in
                    setTimeout(() => {
                        // Double check we are at the right index (should be guaranteed by math)
                        // But strictly setting it ensures state consistency
                        setCurrentIndex(finalIndex);
                        setLockedDestination(targetDest);
                        setPhase('locked');
                        setIsTransitioning(false);
                    }, 300);
                    return;
                }

                // Move to next phase speed
                if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
                spinIntervalRef.current = setInterval(spin, spinSequence[currentPhaseIndex].interval);
            }
        };

        // Start
        spinIntervalRef.current = setInterval(spin, spinSequence[0].interval);
    };

    // Confirm selection and trigger trip planning
    const handleConfirm = () => {
        if (!lockedDestination) return;

        const generatedPrompt = `Surprise trip to ${lockedDestination.name} for a weekend getaway. Make it exciting and memorable!`;
        onDestinationSelected(lockedDestination.name, generatedPrompt);
    };

    // Reset and try again
    const handleRespin = () => {
        setPhase('ready');
        setLockedDestination(null);
        setCurrentIndex(0);
    };

    const visible = getVisibleDestinations(currentIndex);

    return (
        <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center relative z-10">

            {/* Tactical Background (matching TripPlanner) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-cyan-900/20 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] border border-cyan-500/5 rounded-full animate-[spin_120s_linear_infinite]" />
            </div>

            {/* Back Button */}
            <button
                onClick={onCancel}
                className="absolute top-28 left-6 flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-mono uppercase tracking-widest">Back</span>
            </button>

            <div className="max-w-2xl w-full animate-fade-in-up relative z-10">
                {/* Header - Compact */}
                <div className="text-center mb-10 relative">
                    <span className="relative inline-block py-1 mb-4 text-[10px] font-bold tracking-[0.4em] text-cyan-400 uppercase bg-black border border-cyan-500/50 px-4 font-mono shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                        <Shuffle className="w-3 h-3 inline mr-2" />
                        RNG Protocol
                    </span>
                    <h1 className="mb-2 font-sans text-4xl md:text-5xl font-bold tracking-tighter text-white uppercase">
                        Surprise <span className="text-cyan-400">Me</span>
                    </h1>
                </div>

                {/* Main Card - Compact */}
                <div className="relative group max-w-xl mx-auto">
                    {/* HUD Glow */}
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500/50 to-emerald-500/50 opacity-20 blur-lg transition duration-500 ${phase === 'spinning' ? 'opacity-40 animate-pulse' : phase === 'locked' ? 'from-emerald-500/50 to-cyan-500/50 opacity-50' : ''}`} />

                    <div className="relative bg-black/90 backdrop-blur-xl border border-white/10">
                        {/* Corner Decorations */}
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500" />

                        {/* Header Bar */}
                        <div className="h-8 bg-white/5 flex items-center justify-between px-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${phase === 'spinning' ? 'bg-yellow-500 animate-pulse' : phase === 'locked' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                                    {phase === 'ready' ? 'Ready' : phase === 'spinning' ? 'Spinning...' : 'Locked!'}
                                </span>
                            </div>
                            <div className="text-[9px] font-mono text-zinc-600">{SURPRISE_DESTINATIONS.length} options</div>
                        </div>

                        {/* Main Content */}
                        <div className="p-6">
                            {/* READY PHASE */}
                            {phase === 'ready' && (
                                <div className="text-center animate-fade-in-up">
                                    <div className="py-4 mb-4">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-cyan-500/30 flex items-center justify-center bg-cyan-500/5">
                                            <Shuffle className="w-7 h-7 text-cyan-400" />
                                        </div>
                                        <p className="text-zinc-500 text-xs font-mono">Spin to discover your destination</p>
                                    </div>

                                    <button
                                        onClick={startSpin}
                                        className="w-full relative group/btn overflow-hidden py-4 bg-cyan-500 text-black font-bold uppercase tracking-widest text-sm transition-all hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            <Shuffle className="w-4 h-4" />
                                            Spin the Wheel
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* SPINNING PHASE - Animated Reel */}
                            {phase === 'spinning' && (
                                <div className="text-center animate-fade-in-up">
                                    <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest mb-4 animate-pulse">
                                        <Terminal className="w-3 h-3 inline mr-1" />
                                        Scanning...
                                    </div>

                                    {/* Slot Machine Reel with scroll animation */}
                                    <div className="relative h-[180px] flex items-center justify-center overflow-hidden">
                                        {/* Gradient masks */}
                                        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
                                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />

                                        {/* Center Highlight */}
                                        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-14 border-y border-cyan-500/40 bg-cyan-500/5 z-5" />

                                        {/* Reel with sliding animation - moves UP when index increases */}
                                        <div
                                            className="relative flex flex-col items-center"
                                            style={{
                                                transform: isTransitioning ? 'translateY(-52px)' : 'translateY(0)',
                                                transition: isTransitioning ? 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                                            }}
                                        >
                                            {/* Previous */}
                                            <div className="h-[52px] flex items-center justify-center">
                                                <span className="text-xl md:text-2xl font-bold text-zinc-600 uppercase tracking-tight">
                                                    {visible.prev.name}
                                                </span>
                                            </div>

                                            {/* Current (Center) */}
                                            <div className="h-[52px] flex items-center justify-center">
                                                <span className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                                                    {visible.current.name}
                                                </span>
                                            </div>

                                            {/* Next */}
                                            <div className="h-[52px] flex items-center justify-center">
                                                <span className="text-xl md:text-2xl font-bold text-zinc-600 uppercase tracking-tight">
                                                    {visible.next.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LOCKED PHASE */}
                            {phase === 'locked' && lockedDestination && (
                                <div className="text-center animate-fade-in-up">
                                    {/* Badge */}
                                    <div className="inline-flex items-center gap-2 py-1 px-3 mb-6 bg-black border border-emerald-500/50">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-emerald-400 font-mono">
                                            Locked
                                        </span>
                                    </div>

                                    {/* Destination */}
                                    <div
                                        className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2"
                                        style={{ animation: 'lockIn 0.4s ease-out' }}
                                    >
                                        {lockedDestination.name}
                                    </div>

                                    <p className="text-sm text-zinc-500 font-mono uppercase tracking-widest mb-8">
                                        {lockedDestination.tagline}
                                    </p>

                                    {/* Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleRespin}
                                            className="flex-1 py-3 border border-white/20 text-white font-bold uppercase tracking-wider text-xs hover:bg-white/5 transition-all font-mono"
                                        >
                                            <Shuffle className="w-3 h-3 inline mr-2" />
                                            Respin
                                        </button>
                                        <button
                                            onClick={handleConfirm}
                                            className="flex-1 py-3 bg-cyan-500 text-black font-bold uppercase tracking-wider text-xs hover:bg-white transition-all"
                                        >
                                            <Zap className="w-3 h-3 inline mr-2 fill-black" />
                                            Plan Trip
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Keyframes */}
            <style>{`
                @keyframes lockIn {
                    0% { transform: scale(0.9); opacity: 0; }
                    50% { transform: scale(1.03); }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SurpriseMe;
