const fs = require('fs');
const path = 'components/Dashboard.tsx';
let c = fs.readFileSync(path, 'utf8');

// We look for the start of WorldMap and the start of Dashboard component
const startMarker = 'const WorldMap = ({ trips }: { trips: any[] }) => {';
const endMarker = 'const Dashboard: React.FC<DashboardProps> =';

const start = c.indexOf(startMarker);
const end = c.indexOf(endMarker);

if (start !== -1 && end !== -1 && start < end) {
    const newMap = `const WorldMap = ({ trips }: { trips: any[] }) => {
    // Determine center
    let center: [number, number] = [20, 0];
    let zoom = 2;

    if (trips.length > 0) {
        const first = trips[0];
        if (first.data?.coordinates?.lat && first.data?.coordinates?.lon) {
            center = [first.data.coordinates.lat, first.data.coordinates.lon];
            zoom = 4;
        } else {
             const city = first.destination || '';
             const cityKey = Object.keys(CITY_COORDINATES).find(c => city.includes(c));
             const coords = CITY_COORDINATES[city] || (cityKey ? CITY_COORDINATES[cityKey] : null);
             
             if (coords) {
                 center = [coords.lat, coords.lon];
                 zoom = 4;
             }
        }
    }

    return (
        <div className="relative w-full h-full min-h-[400px] bg-[#050505] overflow-hidden group z-0">
             <MapContainer 
                center={center} 
                zoom={zoom} 
                scrollWheelZoom={true} 
                className="w-full h-full z-0"
                style={{ background: '#050505', minHeight: '100%' }}
                maxBounds={[[-90, -180], [90, 180]]}
                minZoom={2}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* CSS to darken the map tiles only */}
                <style>{\`
                    .leaflet-layer {
                        filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
                    }
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
                        background: #050505;
                    }
                \`}</style>
                
                {trips.map((trip) => {
                    let position: [number, number] | null = null;
                    if (trip.data?.coordinates?.lat && trip.data?.coordinates?.lon) {
                        position = [trip.data.coordinates.lat, trip.data.coordinates.lon];
                    } else {
                         const city = trip.destination || '';
                         const cityKey = Object.keys(CITY_COORDINATES).find(c => city.includes(c));
                         const coords = CITY_COORDINATES[city] || (cityKey ? CITY_COORDINATES[cityKey] : null);
                         
                         if (coords) {
                             position = [coords.lat, coords.lon];
                         }
                    }

                    if (!position) return null;

                    return (
                        <Marker key={trip.id} position={position}>
                             <Popup>
                                <div className="min-w-[120px]">
                                    <strong className="text-cyan-400 uppercase tracking-wider block mb-2 text-xs">{trip.destination}</strong>
                                    <span className={\`text-[10px] uppercase font-bold px-2 py-1 rounded border inline-block \${
                                        trip.status === 'confirmed' 
                                            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
                                            : trip.status === 'paused' 
                                                ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' 
                                                : 'text-zinc-400 border-zinc-500/30'
                                    }\`}>
                                        {trip.status === 'confirmed' ? 'Active' : trip.status === 'paused' ? 'Frozen' : 'Completed'}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
            
             {/* Map Controls Helper */}
             <div className="absolute bottom-4 left-4 z-[400] pointer-events-none flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">Live Sat-Link</span>
                </div>
                 <span className="text-xs font-bold text-white uppercase">
                    {trips.length} Targets Verified
                 </span>
             </div>
        </div>
    );
};

\n\n`;

    // Careful with replacement to allow for empty lines before next component
    // We want to preserve the end marker (Dashboard component def)
    const newContent = c.substring(0, start) + newMap + c.substring(end);

    try {
        fs.writeFileSync(path, newContent);
        console.log('Replaced WorldMap successfully');
    } catch (err) {
        console.error('Failed to write file:', err.message);
        process.exit(1);
    }
} else {
    console.log('Could not find markers');
    console.log('Start marker found:', start !== -1);
    console.log('End marker found:', end !== -1);
}
