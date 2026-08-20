import React, { useState, useEffect, useMemo } from 'react';
import { Globe, Navigation, Radar, Signal, Crosshair, Radio, Scan, Activity, Cpu, Shield } from 'lucide-react';

interface MapOverlayProps {
    isActive?: boolean;
    tripCount?: number;
    userLocation?: { lat: number; lng: number } | null;
    isHydrated?: boolean;
}

/**
 * A highly creative, modern tactical overlay for the Mission Map.
 * Features real-time data integration, holographic glass readouts, and neural logs.
 */
const MapOverlay: React.FC<MapOverlayProps> = ({
    isActive = true,
    tripCount = 0,
    userLocation,
    isHydrated = false
}) => {
    const [systemLogs, setSystemLogs] = useState<{ id: number; val: string }[]>([]);

    // Logic: CPU load increases with number of missions (trips)
    const cpuLoad = useMemo(() => {
        if (!isHydrated) return "0.0";
        const baseLoad = 12.4;
        const perTripLoad = 2.1;
        return (baseLoad + (tripCount * perTripLoad)).toFixed(1);
    }, [tripCount, isHydrated]);

    // Logic: Temperature scales with CPU load
    const systemTemp = useMemo(() => {
        const loadNum = parseFloat(cpuLoad);
        return (30 + (loadNum / 5)).toFixed(0);
    }, [cpuLoad]);

    useEffect(() => {
        if (!isActive) {
            setSystemLogs([]); // Clear logs when leaving view
            return;
        };

        // BOOT SEQUENCE: Clear and trigger fresh logs on entry
        setSystemLogs([
            { id: 1, val: "INITIALIZING_HUD_OS" },
            { id: 2, val: "LINKING_SATELLITE_ARRAY" }
        ]);

        const interval = setInterval(() => {
            // Random technical data generator (Balanced: 60ms = ~16fps for smoothness without roasting CPU)
            if (Math.random() > 0.6) {
                setSystemLogs(prev => [
                    { id: Date.now(), val: `SYNC_0x${Math.floor(Math.random() * 999).toString(16).toUpperCase()}` },
                    ...prev.slice(0, 4)
                ]);
            }
        }, 60); // Restore "hacker" speed (was 150ms, originally 30ms)
        return () => clearInterval(interval);
    }, [isActive]);

    // Generate real system logs based on app state changes
    useEffect(() => {
        const logs = [];
        if (isHydrated) logs.push(`SYSTEM_ID: VOYAGER_NODE_${Math.floor(Math.random() * 9000) + 1000}`);
        if (userLocation) logs.push(`GEO_LOC_LOCK: ${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}`);
        if (tripCount > 0) logs.push(`MISSION_DATA_SYNC: ${tripCount} ACTIVE`);

        setSystemLogs(logs.map((l, i) => ({ id: i, val: l })));
    }, [isHydrated, userLocation, tripCount]);

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-2xl">

            {/* 1. PERIPHERAL ENERGY BORDERS - Subtle Glow pulses */}
            <div className="absolute inset-0 border border-cyan-500/10 pointer-events-none z-20" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-scan-horizontal" />
            <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent animate-scan-vertical" />

            {/* 2. TOP LEFT: TACTICAL READOUT - Hidden on mobile */}
            <div className={`absolute top-4 left-4 md:top-6 md:left-6 hidden md:flex flex-col gap-3 z-30 transition-all duration-1000 delay-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <div className="bg-black/40 backdrop-blur-md border-l-2 border-cyan-400 px-4 py-2 flex flex-col gap-1 shadow-2xl">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">System_Core</span>
                    </div>
                    <div className="flex gap-4 font-mono text-[9px]">
                        <span className="text-zinc-400 uppercase tracking-widest">Status: <span className="text-emerald-400">{isHydrated ? 'Active' : 'Syncing'}</span></span>
                    </div>
                </div>

                {/* Coordinate Tracker - Minimalist & MISSION BASED */}
                <div className="flex items-center gap-3 font-mono text-[9px] text-zinc-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <Navigation className="w-3 h-3 text-emerald-400" />
                    <span className="text-white font-bold opacity-60">MISSION_LOC:</span>
                    <span>{userLocation && userLocation.lat !== 0 ? `${userLocation.lat.toFixed(4)} ${userLocation.lat >= 0 ? 'N' : 'S'}` : 'PENDING_COORDS'}</span>
                    <span className="opacity-20">/</span>
                    <span>{userLocation && userLocation.lng !== 0 ? `${userLocation.lng.toFixed(4)} ${userLocation.lng >= 0 ? 'E' : 'W'}` : 'AWAITING_LOCK'}</span>
                </div>
            </div>

            {/* 3. TOP RIGHT: MISSION LOG STREAM - Hidden on mobile */}
            <div className={`absolute top-4 right-4 md:top-6 md:right-6 hidden md:flex flex-col items-end gap-2 z-30 transition-all duration-1000 delay-500 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-lg flex flex-col items-end gap-1 min-w-[140px]">
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Active Protocols</div>
                    <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-3xl font-black text-white tracking-tighter tabular-nums">
                            {String(tripCount).padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Rolling Technical Log - Meaningful */}
                <div className="flex flex-col items-end gap-1 opacity-60">
                    {systemLogs.map(log => (
                        <div key={log.id} className="text-[8px] font-mono text-cyan-400/80 animate-fade-in-right">
                            {log.val} &gt;&gt; [READY]
                        </div>
                    ))}
                </div>
            </div>

            {/* 6. AMBIENT GRID - Ultra subtle */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                }} />
            </div>

            <style>{`
                @keyframes scan-horizontal {
                    0% { transform: translateX(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(100%); opacity: 0; }
                }
                @keyframes scan-vertical {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(100%); opacity: 0; }
                }
                @keyframes fade-in-right {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-scan-horizontal { animation: scan-horizontal 8s linear infinite; }
                .animate-scan-vertical { animation: scan-vertical 12s linear infinite; }
                .animate-spin-slow { animation: spin 10s linear infinite; }
                .animate-ping-slow { animation: ping 4s cubic-bezier(0, 0, 0.2, 1) infinite; }
            `}</style>
        </div>
    );
};

export default MapOverlay;
