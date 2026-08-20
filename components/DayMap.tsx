import React, { useMemo, useState, useEffect } from 'react';
import { Map, MapMarker, MarkerContent, MapControls, MapRoute } from './ui/map';
import { MapPin, Loader2, Users, Battery, Plus, Minus } from 'lucide-react';
import { PresencePayload } from '../services/presenceService';
import { SquadMember } from '../types';

interface LocationPoint {
    name: string;
    lat: number;
    lng: number;
    type?: 'activity' | 'hotel' | 'dining' | 'transport';
}

interface DayMapProps {
    locations: LocationPoint[];
    squadPresence?: Record<string, PresencePayload>;
    members?: SquadMember[];
    height?: string;
    showRoute?: boolean;
}

export const DayMap: React.FC<DayMapProps> = ({
    locations,
    squadPresence = {},
    members = [],
    height = '280px',
    showRoute = true
}) => {
    // State for road route
    const [roadRoute, setRoadRoute] = useState<[number, number][]>([]);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const mapRef = React.useRef<any>(null);
    const hasInitiallyCentered = React.useRef(false);

    // 1. Calculate Center & Bounds to show ALL markers
    const mapConfig = useMemo(() => {
        const squadMates = Object.values(squadPresence).filter(p => p.lat !== 0 || p.lng !== 0);
        const squadCoords = squadMates.map(p => ({ lat: p.lat, lng: p.lng }));
        const allCoords = [
            ...locations.map(l => ({ lat: l.lat, lng: l.lng })),
            ...squadCoords
        ];

        if (allCoords.length === 0) {
            return {
                center: [77.5946, 12.9716] as [number, number], // Default Bengaluru [lng, lat]
                zoom: 11
            };
        }

        // FIND CAPTAIN for priority centering
        const captainPresence = squadMates.find(p => {
            const memberInfo = members.find(m => m.user_id === p.user_id);
            return memberInfo?.role === 'Captain' || memberInfo?.role === 'Admin';
        });

        const lats = allCoords.map(l => l.lat);
        const lngs = allCoords.map(l => l.lng);

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const centerLat = captainPresence ? captainPresence.lat : (minLat + maxLat) / 2;
        const centerLng = captainPresence ? captainPresence.lng : (minLng + maxLng) / 2;

        const latSpread = maxLat - minLat;
        const lngSpread = maxLng - minLng;
        const maxSpread = Math.max(latSpread, lngSpread);

        let zoom = 12;
        if (maxSpread > 0.5) zoom = 10;
        else if (maxSpread > 0.2) zoom = 11;
        else if (maxSpread > 0.1) zoom = 12;
        else if (maxSpread > 0.05) zoom = 13;
        else zoom = 14;

        if (allCoords.length === 1) zoom = 15;

        return {
            center: [centerLng, centerLat] as [number, number],
            zoom
        };
    }, [locations, squadPresence, members]);

    const [mapDisplay, setMapDisplay] = useState<{ center: [number, number], zoom: number } | null>(null);

    useEffect(() => {
        if (!mapDisplay && mapConfig) {
            setMapDisplay(mapConfig);
            hasInitiallyCentered.current = true;
        } else if (mapConfig && !hasInitiallyCentered.current) {
            setMapDisplay(mapConfig);
            hasInitiallyCentered.current = true;
        }
    }, [mapConfig, mapDisplay]);

    const displayLocations = useMemo(() => {
        if (!locations || locations.length === 0) return [];
        const processed: LocationPoint[] = [];
        const coordCounts: { [key: string]: number } = {};

        locations.forEach(loc => {
            const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
            const count = coordCounts[key] || 0;
            coordCounts[key] = count + 1;

            if (count > 0) {
                const angle = (count * 60) * (Math.PI / 180);
                const offset = 0.0005 * count;
                processed.push({
                    ...loc,
                    lat: loc.lat + offset * Math.sin(angle),
                    lng: loc.lng + offset * Math.cos(angle)
                });
            } else {
                processed.push(loc);
            }
        });
        return processed;
    }, [locations]);

    const waypoints = useMemo(() => {
        if (!showRoute || locations.length < 2) return [];
        const unique: [number, number][] = [];

        locations.forEach((loc, idx) => {
            if (idx === 0) {
                unique.push([loc.lng, loc.lat]);
                return;
            }
            const prev = unique[unique.length - 1];
            if (Math.abs(prev[0] - loc.lng) > 0.0001 || Math.abs(prev[1] - loc.lat) > 0.0001) {
                unique.push([loc.lng, loc.lat]);
            }
        });

        if (unique.length < 2 && locations.length >= 2) {
            const last = locations[locations.length - 1];
            if (Math.abs(unique[0][0] - last.lng) > 0.000001 || Math.abs(unique[0][1] - last.lat) > 0.000001) {
                unique.push([last.lng, last.lat]);
            }
        }

        return unique.length >= 2 ? unique : [];
    }, [locations, showRoute]);

    useEffect(() => {
        let isMounted = true;
        if (waypoints.length < 2) {
            setRoadRoute([]);
            return;
        }

        const fetchRoute = async () => {
            setIsLoadingRoute(true);
            try {
                if (waypoints.length > 10) {
                    if (isMounted) setRoadRoute(waypoints);
                    return;
                }
                const { calculateRouteCached } = await import('../services/routingService');
                const result = await calculateRouteCached(waypoints);
                if (isMounted) {
                    if (result && result.coordinates && result.coordinates.length > 0) {
                        setRoadRoute(result.coordinates);
                    } else {
                        setRoadRoute(waypoints);
                    }
                }
            } catch (error) {
                console.warn("Route fetch failed, falling back to straight lines");
                if (isMounted) setRoadRoute(waypoints);
            } finally {
                if (isMounted) setIsLoadingRoute(false);
            }
        };

        const timeoutId = setTimeout(fetchRoute, 500);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [waypoints]);

    const centerOnSquad = () => {
        const squadMates = Object.values(squadPresence).filter(p => p.lat !== 0 || p.lng !== 0);
        if (squadMates.length > 0 && mapRef.current) {
            const captain = squadMates.find(p => {
                const info = members.find(m => m.user_id === p.user_id);
                return info?.role === 'Captain' || info?.role === 'Admin';
            });
            if (captain) {
                mapRef.current.flyTo({ center: [captain.lng, captain.lat], zoom: 15, duration: 1500 });
            } else {
                const lats = squadMates.map(p => p.lat);
                const lngs = squadMates.map(p => p.lng);
                mapRef.current.flyTo({
                    center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
                    zoom: 14,
                    duration: 1500
                });
            }
        }
    };

    const centerOnObjectives = () => {
        if (locations.length > 0 && mapRef.current) {
            const lats = locations.map(l => l.lat);
            const lngs = locations.map(l => l.lng);
            mapRef.current.flyTo({
                center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
                zoom: 12,
                duration: 1000
            });
        }
    };

    if (!locations || locations.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-8 text-center h-full flex flex-col items-center justify-center">
                <MapPin className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No locations to display</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl overflow-hidden border border-white/10 relative shadow-2xl bg-zinc-950" style={{ height }}>
            {isLoadingRoute && (
                <div className="absolute top-2 left-2 z-50 bg-black/80 text-cyan-400 px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                </div>
            )}

            <Map
                ref={mapRef}
                center={mapDisplay?.center || [77.5946, 12.9716]}
                zoom={mapDisplay?.zoom || 11}
                theme="dark"
                attributionControl={false}
            >
                <MapControls showCompass={false} />
                {roadRoute.length > 0 && (
                    <MapRoute coordinates={roadRoute} color="#06b6d4" width={6} opacity={0.9} />
                )}
                {displayLocations.map((loc, idx) => (
                    <MapMarker key={idx} latitude={loc.lat} longitude={loc.lng}>
                        <MarkerContent>
                            <div className="relative group cursor-pointer">
                                <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-400 text-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] backdrop-blur-sm transition-transform hover:scale-110">
                                    <span className="font-bold text-xs font-mono">{idx + 1}</span>
                                </div>
                                <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-20 -z-10"></div>
                                <div className="absolute left-1/2 -bottom-2 w-[1px] h-2 bg-gradient-to-b from-cyan-400 to-transparent -translate-x-1/2"></div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] bg-black/90 border border-white/10 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    {loc.name}
                                </div>
                            </div>
                        </MarkerContent>
                    </MapMarker>
                ))}

                {Object.values(squadPresence)
                    .filter(member => member.lat !== 0 || member.lng !== 0)
                    .map((member) => {
                        const memberInfo = members.find(m => m.user_id === member.user_id);
                        const displayName = memberInfo?.full_name?.split(' ')[0] || 'VANGUARD';
                        const isAdmin = memberInfo?.role === 'Captain' || memberInfo?.role === 'Admin';
                        return (
                            <MapMarker key={member.user_id} latitude={member.lat} longitude={member.lng}>
                                <MarkerContent>
                                    <div className="relative group cursor-pointer">
                                        <div className={`absolute -inset-4 rounded-full border border-dashed animate-[spin_10s_linear_infinite] pointer-events-none opacity-40 ${isAdmin ? 'border-orange-500/50' : 'border-emerald-500/50'}`} />
                                        <div className={`absolute -inset-2 rounded-full border border-dotted animate-[spin_15s_linear_reverse_infinite] pointer-events-none opacity-30 ${isAdmin ? 'border-orange-400/50' : 'border-emerald-400/50'}`} />
                                        <div className={`relative w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-500 group-hover:scale-125 ${isAdmin ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.6)]' : 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.4)]'}`}>
                                            {memberInfo?.avatar_url ? (
                                                <img
                                                    src={memberInfo.avatar_url}
                                                    alt={displayName}
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            ) : (
                                                <div className={`text-[11px] font-black leading-none mb-0.5 tracking-tighter ${isAdmin ? 'text-orange-400' : 'text-emerald-400'}`}>
                                                    {displayName.slice(0, 1).toUpperCase()}
                                                </div>
                                            )}
                                            {isAdmin ? (
                                                <div className="text-[7px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/20 px-1.5 rounded-full border border-orange-500/30">Admin</div>
                                            ) : (
                                                <Users className="w-3.5 h-3.5 text-emerald-400" />
                                            )}
                                        </div>
                                        <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-black/90 border rounded-sm flex flex-col items-center gap-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 transition-all group-hover:mt-5 ${isAdmin ? 'border-orange-500/50' : 'border-emerald-500/50'}`}>
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-l border-t bg-black/90 block pointer-events-none" style={{ borderColor: isAdmin ? 'rgba(249,115,22,0.5)' : 'rgba(52,211,153,0.5)' }} />
                                            <div className={`text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap ${isAdmin ? 'text-white' : 'text-emerald-400'}`}>{isAdmin ? 'VANGUARD PRIME' : displayName}</div>
                                            {member.battery_level !== undefined && (
                                                <div className="flex items-center gap-1.5 text-[8px] font-mono text-zinc-400">
                                                    <Battery className="w-2.5 h-2.5" />
                                                    {member.battery_level}%
                                                </div>
                                            )}
                                        </div>
                                        <div className={`absolute inset-0 rounded-full animate-[ping_3s_linear_infinite] opacity-20 pointer-events-none ${isAdmin ? 'bg-orange-500' : 'bg-emerald-400'}`} />
                                    </div>
                                </MarkerContent>
                            </MapMarker>
                        );
                    })}
            </Map>

            {/* TACTICAL MAP CONTROLS */}
            <div className="absolute top-6 right-6 z-[1001] flex flex-col gap-3 group/map-controls">
                <div className="flex flex-col gap-2 p-1.5 bg-zinc-950/40 backdrop-blur-2xl border border-emerald-500/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(52,211,153,0.05)]">
                    <button
                        onClick={centerOnSquad}
                        className="p-3 bg-white/5 border border-white/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all hover:scale-110 active:scale-95 shadow-lg group/btn relative"
                    >
                        <Users className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/90 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-white rounded-lg opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all translate-x-2 group-hover/btn:translate-x-0 whitespace-nowrap">Squad Sync</div>
                    </button>
                    <button
                        onClick={centerOnObjectives}
                        className="p-3 bg-white/5 border border-white/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all hover:scale-110 active:scale-95 shadow-lg group/btn relative"
                    >
                        <MapPin className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/90 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-white rounded-lg opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all translate-x-2 group-hover/btn:translate-x-0 whitespace-nowrap">Objectives</div>
                    </button>
                    <div className="h-px bg-white/5 mx-2 my-1" />
                    <button
                        onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() + 1)}
                        className="p-3 bg-white/5 border border-white/10 text-zinc-400 rounded-xl hover:bg-white/10 hover:text-white transition-all hover:scale-110 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => mapRef.current?.setZoom(mapRef.current.getZoom() - 1)}
                        className="p-3 bg-white/5 border border-white/10 text-zinc-400 rounded-xl hover:bg-white/10 hover:text-white transition-all hover:scale-110 active:scale-95"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]" />
            <style>{`
                @keyframes scanline { 0% { transform: translateY(-50%); } 100% { transform: translateY(0%); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export const getDirectionsLink = (from: any, to: any, mode: any = 'driving') => {
    const origin = typeof from === 'string' ? encodeURIComponent(from) : `${from.lat},${from.lng}`;
    const destination = typeof to === 'string' ? encodeURIComponent(to) : `${to.lat},${to.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;
};

export const getPlaceLink = (placeName: string, city?: string) => {
    const query = city ? `${placeName} ${city}` : placeName;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const getCoordinatesLink = (lat: number, lng: number, label?: string) => {
    if (label) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}&query_place_id=${lat},${lng}`;
    return `https://www.google.com/maps/@${lat},${lng},15z`;
};

export default DayMap;
