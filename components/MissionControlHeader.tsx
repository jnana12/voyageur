import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, MapPin, Activity, Clock, Zap, Loader2, Calendar, Check, Snowflake, StopCircle, CheckCircle, Shield, AlertTriangle, Terminal, X, LogOut, Eye } from 'lucide-react';
import { useScramble } from '../hooks/useScramble';
import { StoredTrip } from '../types';

interface MissionControlHeaderProps {
    activeMission: StoredTrip | null;
    onComplete: (e: React.MouseEvent, id: string) => void;
    onFreeze: (e: React.MouseEvent, id: string) => void;
    onResume: (e: React.MouseEvent, id: string) => void;
    onCancel: (e: React.MouseEvent, id: string) => void;
    onLeave?: (e: React.MouseEvent, id: string) => void;
    onViewItinerary?: (trip: StoredTrip) => void;
    onSync: (e: React.MouseEvent, trip: StoredTrip) => void;
    syncProgress: Record<string, string>;
    syncingIds: Record<string, boolean>;
    isLoading?: boolean;
    isGuest?: boolean;
    isAdmin?: boolean;
}

export const MissionControlHeader: React.FC<MissionControlHeaderProps> = ({
    activeMission,
    onComplete,
    onFreeze,
    onResume,
    onCancel,
    onLeave,
    onViewItinerary,
    onSync,
    syncProgress,
    syncingIds,
    isLoading = false,
    isGuest = false,
    isAdmin = false
}) => {
    // Calculate time - returns countdown (T-MINUS) or elapsed (T-PLUS)
    const calculateTime = React.useCallback((): { time: string; mode: 'countdown' | 'elapsed' } => {
        if (!activeMission) return { time: "00:00:00", mode: 'countdown' };

        const isPaused = activeMission.status === 'paused';
        const now = isPaused && activeMission.data?.last_frozen_at
            ? activeMission.data.last_frozen_at
            : new Date().getTime();

        const start = activeMission.startDate ? new Date(activeMission.startDate).getTime() : Date.now();
        const diff = start - now;

        // Trip has started - show elapsed time (T-PLUS)
        if (diff <= 0) {
            const elapsed = Math.abs(diff);
            const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
            const hours = Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
            return {
                time: `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
                mode: 'elapsed'
            };
        }

        // Trip hasn't started - show countdown (T-MINUS)
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return {
            time: `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
            mode: 'countdown'
        };
    }, [activeMission]);

    const [timerData, setTimerData] = useState(calculateTime());
    const [missionStatus, setMissionStatus] = useState<'standby' | 'active'>('standby');
    const [isBooting, setIsBooting] = useState(true);

    // Helper to trigger scramble effect
    const triggerScramble = () => {
        setIsBooting(true);
        setTimeout(() => setIsBooting(false), 1500);
    };

    // Boot sequence: Scramble for 1.5s on mount, then stabilize
    useEffect(() => {
        triggerScramble();
    }, []);

    // Re-trigger scramble when mission status or ID changes
    useEffect(() => {
        triggerScramble();
    }, [activeMission?.status, activeMission?.id]);

    // Hacker Scramble Effect: Active only during boot or specific status changes
    const scrambledTime = useScramble(timerData.time, 35, isBooting);

    // Helper to extract just the place name from long prompts
    const getCleanDestination = (raw: string) => {
        if (!raw) return 'SYSTEM STANDBY';
        // Remove common prefixes
        let clean = raw.replace(/^(a\s+)?(\d+\s+day\s+)?trip\s+to\s+/i, '')
            .replace(/^visit\s+/i, '')
            .replace(/^explore\s+/i, '');

        // Remove suffixes like "at 5k", "for 2 people"
        clean = clean.split(/\s+(at|for|with)\s+/i)[0];

        // Remove trailing commas or dots
        clean = clean.replace(/[.,]$/, '');

        // Remove duration suffix if present (e.g. "Mangalore:duration")
        clean = clean.split(':')[0];
        clean = clean.split(' - ')[0];

        // Robust cleanup for typos/special chars
        clean = clean.replace(/[()*{}^%$#@!]/g, '');

        // Title Case
        clean = clean.toLowerCase().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        return clean.trim();
    };

    // Show VOYAGEUR as default - keep scrambling until activeMission is available
    const rawDestination = activeMission ? getCleanDestination(activeMission.destination) : 'VOYAGEUR';
    // Smart truncation: max 18 chars for display, add "..." if truncated
    const destinationName = rawDestination.length > 18 ? rawDestination.slice(0, 17) + '…' : rawDestination;
    // Keep scrambling during boot OR while loading (hydration period)
    const scrambledDestination = useScramble(destinationName, 45, isBooting || isLoading);

    useEffect(() => {
        if (activeMission) {
            setMissionStatus('active');
            setTimerData(calculateTime()); // Update immediately

            // FREEZE LOGIC: Only run and update interval if NOT paused
            if (activeMission.status !== 'paused') {
                const interval = setInterval(() => {
                    setTimerData(calculateTime());
                }, 1000);
                return () => clearInterval(interval);
            }
        } else {
            setMissionStatus('standby');
            setTimerData({ time: "00:00:00", mode: 'countdown' });
        }
    }, [activeMission, calculateTime]); // Re-run when activeMission or calculateTime changes

    const isSynced = activeMission && (activeMission.data?.calendarEventIds?.length || 0) > 0;
    const isSyncing = activeMission && syncingIds[activeMission.id];

    return (
        <div className="col-span-12 mb-0 md:mb-6 mt-4 md:mt-8 w-full max-w-5xl mx-auto transition-opacity duration-700 ease-out">
            <div className="relative">
                <div className="flex flex-col gap-0 md:gap-6 items-start relative z-10 w-full">
                    {/* Top: Title & Status */}
                    <div className="flex flex-col justify-center w-full">
                        {/* System Status Label - ALIGNED LEFT */}
                        <div className="flex items-center gap-4 mb-0 opacity-100">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-cyan-500 to-transparent"></div>
                            <div className="text-cyan-400 font-mono text-[10px] font-bold tracking-[0.3em] uppercase flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className={`absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 ${activeMission?.status === 'paused' ? '' : 'animate-ping'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 bg-cyan-500 ${activeMission?.status === 'paused' ? 'bg-amber-500' : ''}`}></span>
                                </span>
                                {activeMission ? (activeMission.status === 'paused' ? 'SYSTEM FROZEN' : 'SYSTEM ONLINE') : 'STANDBY'}
                            </div>
                        </div>

                        {/* Massive Modern Typography - Cleanly Left Aligned with anti-clipping padding */}
                        <div className="mt-2 pointer-events-none overflow-visible w-full grid grid-cols-1 grid-rows-1 justify-items-start pl-[0.05em] pr-4 md:pr-24">
                            {/* Main Text layer */}
                            <h1 className="col-start-1 row-start-1 text-6xl sm:text-7xl md:text-9xl lg:text-[11rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500 uppercase tracking-tighter leading-[0.85] select-none"
                                style={{
                                    filter: 'drop-shadow(0 0 40px rgba(34,211,238,0.15))',
                                    transform: `scaleY(1.1) scaleX(${Math.max(0.5, 1 - Math.max(0, destinationName.length - 10) * 0.03)})`,
                                    transformOrigin: 'left center',
                                    letterSpacing: destinationName.length > 10 ? '-0.06em' : '-0.04em',
                                    paddingRight: '0.2em' // Direct glyph buffer
                                }}>
                                {scrambledDestination}
                            </h1>

                            {/* Outline layer - Guaranteed to coincide */}
                            <h1 className="col-start-1 row-start-1 text-6xl sm:text-7xl md:text-9xl lg:text-[11rem] font-black text-transparent stroke-text-cyan opacity-20 uppercase tracking-tighter leading-[0.85] pointer-events-none"
                                style={{
                                    WebkitTextStroke: '1px rgba(34,211,238,0.5)',
                                    transform: `scaleY(1.1) scaleX(${Math.max(0.5, 1 - Math.max(0, destinationName.length - 10) * 0.03)})`,
                                    transformOrigin: 'left center',
                                    letterSpacing: destinationName.length > 10 ? '-0.06em' : '-0.04em',
                                    paddingRight: '0.2em' // Direct glyph buffer
                                }}>
                                {scrambledDestination}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Bottom: Controls (Left Aligned) - MOVED LEFT */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mt-3 md:mt-6 mb-0 md:mb-4">
                    {/* Timer - Simplified Style */}
                    <div className="flex flex-col items-start md:border-r md:border-white/10 md:pr-6 md:mr-2">
                        <div className={`text-[9px] md:text-[10px] uppercase tracking-[0.2em] mb-1 ${timerData.mode === 'elapsed' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {activeMission ? (timerData.mode === 'elapsed' ? 'T-PLUS' : 'T-MINUS') : 'READY'}
                        </div>
                        <div className={`text-2xl md:text-3xl font-mono font-bold tracking-tighter tabular-nums ${activeMission ? 'text-white' : 'text-zinc-700'}`}>
                            {isBooting ? scrambledTime : timerData.time}
                        </div>
                    </div>

                    {/* Actions */}

                    <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-1">
                        {activeMission ? (
                            <>
                                {/* CANCEL BUTTON (Admins Only) */}
                                {isAdmin && (
                                    <button
                                        onClick={(e) => {
                                            onCancel(e, activeMission.id);
                                        }}
                                        className="h-8 md:h-10 px-3 md:px-4 bg-zinc-800 hover:bg-red-900/30 border border-white/10 hover:border-red-500/50 rounded flex items-center gap-2 text-zinc-300 hover:text-red-400 transition-colors"
                                        title="Cancel Mission"
                                    >
                                        <X className="w-4 h-4" />
                                        <span className="hidden md:inline text-xs md:text-sm font-bold uppercase tracking-wider">Cancel</span>
                                    </button>
                                )}

                                {/* LEAVE BUTTON (Guests Only) */}
                                {isGuest && onLeave && (
                                    <button
                                        onClick={(e) => onLeave(e, activeMission.id)}
                                        className="h-8 md:h-10 px-3 md:px-4 bg-zinc-800 hover:bg-red-900/30 border border-white/10 hover:border-red-500/50 rounded flex items-center gap-2 text-zinc-300 hover:text-red-400 transition-colors"
                                        title="Leave Mission"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span className="hidden md:inline text-xs md:text-sm font-bold uppercase tracking-wider">Leave</span>
                                    </button>
                                )}

                                {/* VIEW ITINERARY BUTTON (All Users) */}
                                {onViewItinerary && (
                                    <button
                                        onClick={() => onViewItinerary(activeMission)}
                                        className="h-8 md:h-10 px-3 md:px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/60 rounded flex items-center gap-2 text-cyan-400 transition-colors"
                                        title="View Itinerary"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span className="hidden md:inline text-xs md:text-sm font-bold uppercase tracking-wider">View</span>
                                    </button>
                                )}

                                {/* SYNC BUTTON */}
                                <button
                                    onClick={(e) => onSync(e, activeMission)}
                                    disabled={!!isSyncing}
                                    className={`h-8 md:h-10 px-2 md:px-4 rounded border flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-bold uppercase tracking-wider transition-all ${isSynced
                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                        : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-zinc-300 hover:border-white/30'
                                        } ${isSyncing ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                    {isSyncing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">{syncProgress[activeMission.id] || 'Syncing'}</span>
                                        </>
                                    ) : (
                                        isSynced ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">Synced</span>
                                            </>
                                        ) : (
                                            <>
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">Sync</span>
                                            </>
                                        )
                                    )}
                                </button>

                                {/* FREEZE / RESUME (Admins Only) */}
                                {isAdmin && (
                                    activeMission.status === 'paused' ? (
                                        <button
                                            onClick={(e) => onResume(e, activeMission.id)}
                                            className="h-8 md:h-10 px-3 md:px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 rounded flex items-center gap-2 text-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">Resume</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => onFreeze(e, activeMission.id)}
                                            className="h-8 md:h-10 px-3 md:px-4 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded flex items-center gap-2 text-zinc-300 transition-colors hover:border-blue-400/30 hover:text-blue-200"
                                            title="Freeze Mission"
                                        >
                                            <Snowflake className="w-4 h-4" />
                                            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">Freeze</span>
                                        </button>
                                    )
                                )}

                                {/* COMPLETE (Admins Only) */}
                                {isAdmin && (
                                    <button
                                        onClick={(e) => onComplete(e, activeMission.id)}
                                        className="h-8 md:h-10 px-3 md:px-4 bg-zinc-800 hover:bg-emerald-900/30 border border-white/10 hover:border-emerald-500/50 rounded flex items-center gap-2 text-zinc-300 hover:text-emerald-400 transition-colors"
                                        title="Complete Mission"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">Complete</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="h-10 px-4 flex items-center justify-center border border-dashed border-zinc-700 rounded text-zinc-500 text-xs uppercase tracking-wider">
                                Awaiting Orders
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
