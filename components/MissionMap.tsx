import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, ZoomControl, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Globe } from 'lucide-react';
import MapOverlay from './MapOverlay';
import { useInView } from '../hooks/useInView';

// Helper for place names (Duplicated for isolation)
const cleanDestination = (dest: string | undefined | null) => {
    if (!dest) return '';
    let cleaned = dest.split(':')[0];
    cleaned = cleaned.split(' - ')[0];
    cleaned = cleaned.replace(/,\s*\d+\s+Days?$/i, '');
    cleaned = cleaned.replace(/[()*{}^%$#@!]/g, '');
    cleaned = cleaned.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    return cleaned.trim();
};

const CITY_COORDINATES: Record<string, { lat: number, lon: number }> = {
    "Paris": { lat: 48.8566, lon: 2.3522 },
    "London": { lat: 51.5074, lon: -0.1278 },
    "New York": { lat: 40.7128, lon: -74.0060 },
    "Tokyo": { lat: 35.6762, lon: 139.6503 },
    "Dubai": { lat: 25.2048, lon: 55.2708 },
    "Singapore": { lat: 1.3521, lon: 103.8198 },
    "Los Angeles": { lat: 34.0522, lon: -118.2437 },
    "Sydney": { lat: -33.8688, lon: 151.2093 },
    "Rome": { lat: 41.9028, lon: 12.4964 },
    "Barcelona": { lat: 41.3851, lon: 2.1734 },
    "Amsterdam": { lat: 52.3676, lon: 4.9041 },
    "Berlin": { lat: 52.5200, lon: 13.4050 },
    "San Francisco": { lat: 37.7749, lon: -122.4194 },
    "Rio de Janeiro": { lat: -22.9068, lon: -43.1729 },
    "Cape Town": { lat: -33.9249, lon: 18.4241 },
    "Mumbai": { lat: 19.0760, lon: 72.8777 },
    "Bangkok": { lat: 13.7563, lon: 100.5018 },
    "Istanbul": { lat: 41.0082, lon: 28.9784 },
    "Cairo": { lat: 30.0444, lon: 31.2357 },
    "Mexico City": { lat: 19.4326, lon: -99.1332 },
};

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        const timeout = setTimeout(() => {
            map.invalidateSize();
        }, 400);
        return () => clearTimeout(timeout);
    }, [map]);
    return null;
};

const MapEventsTracker = ({ onMouseMove }: { onMouseMove: (coords: { lat: number, lng: number }) => void }) => {
    useMapEvents({
        mousemove(e) {
            onMouseMove(e.latlng);
        }
    });
    return null;
};

const WorldMapBase = ({ trips, onCursorMove }: { trips: any[], onCursorMove?: (coords: { lat: number, lng: number }) => void }) => {
    const mapRef = useRef<L.Map | null>(null);

    const getInitialCenter = (): [number, number] => {
        if (trips.length > 0) {
            const firstTrip = trips[0];
            if (firstTrip.data?.coordinates?.lat && firstTrip.data?.coordinates?.lon) {
                return [firstTrip.data.coordinates.lat, firstTrip.data.coordinates.lon];
            }
            const city = cleanDestination(firstTrip.destination);
            const coords = CITY_COORDINATES[city] || CITY_COORDINATES[Object.keys(CITY_COORDINATES).find(c => city.includes(c)) || ''];
            if (coords) return [coords.lat, coords.lon];
        }
        return [20, 0];
    };

    const center = getInitialCenter();
    const zoom = trips.length > 0 ? 4 : 2;

    useEffect(() => {
        if (!mapRef.current) return;
        mapRef.current.setView(center, zoom, { animate: false });
    }, [center, zoom]);

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={true}
            zoomControl={false}
            className="w-full h-full z-0"
            minZoom={1}
            zoomSnap={0.5}
            worldCopyJump={true}
            ref={mapRef}
        >
            <ZoomControl position="bottomright" />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {onCursorMove && <MapEventsTracker onMouseMove={onCursorMove} />}
            <MapResizer />

            <style>{`
                .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    border: 1px solid rgba(34, 211, 238, 0.3);
                    border-radius: 4px;
                    font-family: inherit;
                }
                .leaflet-popup-close-button {
                    color: #22d3ee !important;
                }
                .leaflet-container {
                    background: transparent;
                    font-family: inherit;
                }
                .leaflet-pane img {
                    max-width: none !important;
                    max-height: none !important;
                }
                .custom-leaflet-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .custom-leaflet-tooltip::before {
                    display: none !important;
                }
            `}</style>

            {trips.map((trip) => {
                let position: [number, number] | null = null;
                if (trip.data?.coordinates?.lat && trip.data?.coordinates?.lon) {
                    position = [trip.data.coordinates.lat, trip.data.coordinates.lon];
                } else {
                    const city = cleanDestination(trip.destination);
                    const coords = CITY_COORDINATES[city] || CITY_COORDINATES[Object.keys(CITY_COORDINATES).find(c => city.includes(c)) || ''];
                    if (coords) position = [coords.lat, coords.lon];
                }

                if (!position) return null;

                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `
                        <div class="relative flex items-center justify-center w-6 h-6">
                            <div class="absolute w-full h-full bg-cyan-500/20 rounded-full animate-ping"></div>
                            <div class="relative w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] border-2 border-black"></div>
                        </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                });

                return (
                    <Marker key={trip.id} position={position} icon={customIcon}>
                        <Tooltip
                            direction="top"
                            offset={[0, -12]}
                            opacity={1}
                            permanent={false}
                            className="custom-leaflet-tooltip"
                        >
                            <div className="px-3 py-2 bg-black/90 backdrop-blur-md border border-cyan-500/30 rounded shadow-xl text-center min-w-[100px]">
                                <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">{cleanDestination(trip.destination)}</div>
                                <div className="text-xs text-cyan-400 font-mono uppercase">
                                    {trip.status === 'confirmed' ? 'Active Protocol' : trip.status === 'paused' ? 'Mission Frozen' : 'Mission Complete'}
                                </div>
                            </div>
                        </Tooltip>
                    </Marker>
                );
            })}
        </MapContainer>
    );
};

const WorldMap = React.memo(WorldMapBase);

const MissionMap = ({ trips, hydrated }: { trips: any[], hydrated: boolean }) => {
    const [cursorCoords, setCursorCoords] = useState<{ lat: number, lng: number } | null>(null);
    const mapBoxRef = useRef<HTMLDivElement>(null);
    const [ref, isInView] = useInView({ threshold: 0.1 });

    const handleMapMouseMove = (e: React.MouseEvent) => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) return;
        if (!mapBoxRef.current) return;
        const { left, top, width, height } = mapBoxRef.current.getBoundingClientRect();
        const x = (e.clientX - left - width / 2) / (width / 2);
        const y = (e.clientY - top - height / 2) / (height / 2);
        mapBoxRef.current.style.transform = `perspective(1500px) rotateX(${y * -3}deg) rotateY(${x * 3}deg) scale(1.01)`;
        mapBoxRef.current.style.boxShadow = `${x * -15}px ${y * -15}px 40px rgba(34, 211, 238, 0.1), 0 0 60px rgba(34, 211, 238, 0.05)`;
    };

    const handleMapMouseLeave = () => {
        if (!mapBoxRef.current) return;
        mapBoxRef.current.style.transform = `perspective(1500px) rotateX(0deg) rotateY(0deg) scale(1)`;
        mapBoxRef.current.style.boxShadow = `0 0 60px -15px rgba(34, 211, 238, 0.3)`;
    };

    return (
        <div ref={ref} className="w-full">
            <div className={`mb-10 pl-1 transition-all duration-1000 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tighter drop-shadow-xl">
                    Mission <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Map</span>
                </h2>
            </div>

            <div
                ref={mapBoxRef}
                onMouseMove={handleMapMouseMove}
                onMouseLeave={handleMapMouseLeave}
                className="w-full border border-cyan-500/20 bg-black/70 backdrop-blur-xl h-[300px] md:h-[400px] relative group overflow-hidden rounded-2xl shadow-[0_0_60px_-15px_rgba(34,211,238,0.3)] transition-all duration-300 ease-out will-change-transform"
            >
                <div className="absolute inset-0 rounded-2xl border border-cyan-500/10 pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(34,211,238,0.05)' }} />

                <div
                    className={`relative w-full h-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isInView ? 'opacity-100 translate-y-0 scale-100 blur-0' : 'opacity-0 translate-y-8 scale-[1.02] blur-md'
                        }`}
                >
                    <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-[1.02]" style={{ height: '100%' }}>
                        {hydrated && trips.length > 0 ? (
                            <WorldMap trips={trips} onCursorMove={setCursorCoords} />
                        ) : (
                            <div className="w-full h-full bg-zinc-900/80 flex flex-col items-center justify-center gap-4">
                                <Globe className="w-8 h-8 text-cyan-500/30" />
                                <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Awaiting Mission Data</span>
                            </div>
                        )}
                    </div>
                </div>

                <MapOverlay
                    tripCount={trips.length}
                    userLocation={cursorCoords}
                    isHydrated={hydrated}
                    isActive={isInView}
                />
            </div>
            <style>{`
                @keyframes collapse-1 {
                    0% { transform: scale(1.2); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 0; }
                }
                @keyframes collapse-2 {
                    0% { transform: scale(1.1); opacity: 0.3; }
                    100% { transform: scale(1); opacity: 0; }
                }
                @keyframes edge-flash {
                    0% { opacity: 0.5; filter: blur(10px); }
                    100% { opacity: 0; filter: blur(0px); }
                }
                .animate-collapse-1 { animation: collapse-1 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-collapse-2 { animation: collapse-2 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .is-visible .animate-edge-flash { animation: edge-flash 1.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default MissionMap;
