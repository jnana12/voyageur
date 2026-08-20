import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import geolocationService from '../services/geolocationService';

interface OriginSelectorProps {
    onSelect: (origin: string) => void;
    defaultValue?: string;
}

export const OriginSelector: React.FC<OriginSelectorProps> = ({ onSelect }) => {
    // Destructure ipLocation separately to use for suggestions without waiting for GPS
    const { location: activeLocation, ipLocation, loading, error, requestGPS, refreshIP } = useGeolocation();
    const [manualInput, setManualInput] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // fetch suggestions immediately using IP location (or default if null)
    useEffect(() => {
        // Prioritize IP location for initial suggestions as it doesn't require permission
        const cities = geolocationService.getSuggestedCities(ipLocation);
        setSuggestions(cities);
    }, [ipLocation]);

    const handleGPSClick = async () => {
        const loc = await requestGPS();
        if (loc && loc.city) {
            onSelect(loc.city);
        } else if (loc && loc.formatted) {
            onSelect(loc.formatted);
        }
    };

    return (
        <div className="w-full space-y-4 animate-fade-in-up">
            <div className="flex flex-col gap-3">
                {/* 1. GPS Button (High Prominence) */}
                <button
                    onClick={handleGPSClick}
                    disabled={loading}
                    className="relative group w-full flex items-center justify-center gap-3 py-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 transition-all rounded-lg"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Navigation className="w-5 h-5 fill-cyan-500/20" />
                    )}
                    <span className="font-mono text-sm uppercase tracking-wider font-bold">
                        {loading ? 'Locating...' : 'Use Current Location'}
                    </span>
                    {activeLocation?.city && !loading && (
                        <span className="absolute right-4 text-xs text-cyan-500/50 font-mono">
                            Detected: {activeLocation.city}
                        </span>
                    )}
                </button>

                {error && (
                    <p className="text-red-400 text-xs font-mono text-center">{error}</p>
                )}

                {/* 2. Smart Chips (Medium Prominence) */}
                <div className="space-y-2">
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest text-center">
                        Or select a major hub
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {suggestions.map((city) => (
                            <button
                                key={city}
                                onClick={() => onSelect(city)}
                                className="px-4 py-2 bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-zinc-400 hover:text-cyan-400 text-xs uppercase tracking-wider font-mono transition-all rounded-full"
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Manual Input (Standard) */}
                <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-zinc-600" />
                    </div>
                    <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && manualInput.trim()) {
                                onSelect(manualInput.trim());
                            }
                        }}
                        placeholder="Type another city..."
                        className="w-full bg-black/50 border border-zinc-800 text-zinc-300 text-sm font-mono placeholder-zinc-700 rounded-lg py-3 pl-10 pr-4 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all uppercase"
                    />
                    <div className="absolute inset-y-0 right-2 flex items-center">
                        <button
                            onClick={() => manualInput.trim() && onSelect(manualInput.trim())}
                            disabled={!manualInput.trim()}
                            className="p-1.5 bg-zinc-800 hover:bg-cyan-500 text-zinc-500 hover:text-black rounded transition-colors disabled:opacity-0 disabled:pointer-events-none"
                        >
                            <span className="text-[10px] font-bold">GO</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
