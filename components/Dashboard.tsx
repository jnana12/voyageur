import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { ArrowRight, History, Settings, Calendar, LogOut, CreditCard, User, Loader2, Check, Crown, Leaf, MapPin, Fingerprint, Link, Users, Terminal, ChevronRight, ChevronDown, Star, LayoutGrid, Zap, Globe, Award, HelpCircle, CheckCircle, XCircle, X, Snowflake, Play, AlertTriangle, Plus, ShieldCheck, Share2, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toBlob } from 'html-to-image';
import { geocodePlace } from '../services/geocodingService';

// --- NEW IMPORTS FOR SHARE EDITOR ---
import Cropper from 'react-easy-crop';
import { motion } from 'framer-motion'; import { googleCalendarService } from '../services/googleCalendarService';
import { supabase } from '../services/supabaseClient';

// Lazy Load Heavy Components for Mobile Performance
const Integrations = React.lazy(() => import('./Integrations'));
// FeaturedExpeditions returned to eager load to prevent "too much time to load" perception
import FeaturedExpeditions from './FeaturedExpeditions';
const MissionMap = React.lazy(() => import('./MissionMap'));
import { AppView, UserProfile, StoredTrip } from '../types';
import { dbService, getTripsKey, getPromptsKey } from '../services/dbService';
import { getLocal, setLocal, STORAGE_KEYS, DEFAULT_STATS } from '../utils/storage';
import { Modal } from './Modal';
import { MissionControlHeader } from './MissionControlHeader';
import { ScrambleText } from './ui/ScrambleText';
import { useInView } from '../hooks/useInView';
import { useGeolocation } from '../hooks/useGeolocation';
// import LoadingScreen from './LoadingScreen';

interface DashboardProps {
    setView: (view: AppView) => void;
    user: UserProfile | null;
    onLoadTrip: (trip: any) => void;
    onJoinMission: (code: string) => void;
    initialTab?: 'overview' | 'prompts' | 'settings';
    setIsLoggedIn: (value: boolean) => void;
    onSignOut: () => void;
}

type Tab = 'overview' | 'prompts' | 'settings';

const maskApiKey = (text: string) => {
    if (!text) return text;
    return text.replace(/(AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{20,})/g, '[REDACTED API KEY]');
};

const TimelineNode = ({ status, label }: { status: 'completed' | 'active' | 'pending', label: string }) => (
    <div className="flex flex-col items-center gap-3 relative z-10 group">
        <div className={`w - 6 h - 6 border - 2 flex items - center justify - center transition - all duration - 300 ${status === 'completed' ? 'bg-white border-white text-black' :
            status === 'active' ? 'bg-black border-cyan-400 animate-pulse' :
                'bg-black border-zinc-700'
            } rounded - full`}>
            {status === 'completed' && <div className="w-2 h-2 bg-black rounded-full" />}
            {status === 'active' && <div className="w-2 h-2 bg-cyan-400 rounded-full" />}
        </div>
        <span className={`text - xs font - mono uppercase tracking - wider transition - colors duration - 300 ${status === 'active' ? 'text-cyan-400 font-bold' :
            status === 'completed' ? 'text-white' : 'text-zinc-600'
            } `}>{label}</span>
    </div>
);



const RadarChart = ({ data }: { data: { label: string; value: number }[] }) => {
    // 4 axes for Adventure, Luxury, Culture, Relaxation
    // Center is 50, 50. Radius 40.
    const size = 180;
    const center = size / 2;
    const radius = size / 2 - 20;

    // Helper to get coordinates
    const getPoint = (value: number, index: number, total: number) => {
        const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
        const r = (value / 100) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y} `;
    };

    const points = data.map((d, i) => getPoint(d.value, i, data.length)).join(' ');
    const axes = data.map((d, i) => {
        const p = getPoint(100, i, data.length);
        return <line key={i} x1={center} y1={center} x2={p.split(',')[0]} y2={p.split(',')[1]} stroke="#333" strokeWidth="1" />;
    });

    const labelPoints = data.map((d, i) => {
        const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
        const r = radius + 15;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return { x, y, label: d.label };
    });

    return (
        <div className="flex justify-center py-8">
            <svg width={size} height={size} className="overflow-visible">
                {/* Background Grid (Concentric webs) */}
                {[25, 50, 75, 100].map((tick) => (
                    <polygon
                        key={tick}
                        points={data.map((_, i) => getPoint(tick, i, data.length)).join(' ')}
                        fill="none"
                        stroke="#222"
                        strokeWidth="1"
                        strokeDasharray={tick === 100 ? "" : "4 4"}
                    />
                ))}

                {/* Axes */}
                {axes}

                {/* Data Polygon */}
                <polygon points={points} fill="rgba(6, 182, 212, 0.2)" stroke="#06b6d4" strokeWidth="2" />

                {/* Data Points */}
                {data.map((d, i) => {
                    const [cx, cy] = getPoint(d.value, i, data.length).split(',');
                    return <circle key={i} cx={cx} cy={cy} r="3" fill="#06b6d4" />;
                })}

                {/* Labels */}
                {labelPoints.map((p, i) => (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-zinc-400 text-[10px] font-bold uppercase tracking-wider"
                    >
                        {p.label}
                    </text>
                ))}
            </svg>
        </div>
    );
};

const getPersona = (dna: any) => {
    if (!dna) return { title: "The Novice", desc: "Your journey has just begun." };

    const max = Math.max(dna.Adventure || 0, dna.Luxury || 0, dna.Culture || 0, dna.Relaxation || 0);

    if (max === 0) return { title: "The Blank Canvas", desc: "Ready to be painted with experiences." };
    if (dna.Adventure === max) return { title: "The Pathfinder", desc: "You seek the thrill of the unknown and the beauty of the wild." };
    if (dna.Luxury === max) return { title: "The Sovereign", desc: "You appreciate the finer things in life and uncompromising comfort." };
    if (dna.Culture === max) return { title: "The Historian", desc: "You travel to learn, to connect, and to witness the legacy of humanity." };
    if (dna.Relaxation === max) return { title: "The Zen Master", desc: "For you, travel is about restoration, peace, and finding your center." };

    return { title: "The Voyager", desc: "A balanced traveler adapting to every world." };
};

const cleanDestination = (dest: string | undefined | null) => {
    if (!dest) return '';
    // 1. Initial Split
    let cleaned = dest.split(':')[0];
    cleaned = cleaned.split(' - ')[0];

    // 2. Remove Common Duration Patterns
    cleaned = cleaned.replace(/,\s*\d+\s+Days?$/i, '');

    // 3. Remove Special Characters/Typos (keep letters, spaces, limited punctuation)
    // Removes: ( ) * ^ % $ # @ !
    cleaned = cleaned.replace(/[()*{}^%$#@!]/g, '');

    // 4. Title Case
    cleaned = cleaned.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return cleaned.trim();
};

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <label className="relative inline-flex items-center cursor-pointer group">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-zinc-300 after:border after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-400 border border-white/10 group-hover:border-cyan-400/50 transition-colors"></div>
    </label>
);

const SettingRow = ({ label, desc, children }: { label: string, desc: string, children?: React.ReactNode }) => (
    <div className="flex justify-between items-center py-4 border-b border-white/5 first:pt-0 last:border-0 hover:bg-white/[0.02] -mx-4 px-4 transition-colors">
        <div>
            <div className="text-sm font-bold text-white uppercase tracking-wide">{label}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
        </div>
        {children}
    </div>
);


const Skeleton = ({ className }: { className?: string }) => (
    <span className={`inline - block bg - white / 10 rounded animate - pulse ${className} `}>&nbsp;</span>
);

// Animated container that triggers child animations when scrolled into view
const AnimatedSection = ({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    // Threshold reduced to 0.05 to trigger early
    const [ref, isInView] = useInView({ threshold: 0.05, triggerOnce: true });

    // Force visible on mobile immediately to prevent blank content
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    const visible = isMobile ? true : isInView;

    return (
        <div
            ref={ref}
            className={`${className} ${visible ? 'animate-in' : ''} will - change - [opacity, transform]`}
        >
            {children}
        </div>
    );
};

// --- MOCK DATA FOR MAP MOVED TO MissionMap.tsx ---

const Dashboard: React.FC<DashboardProps> = ({ setView, user, onLoadTrip, onJoinMission, initialTab = 'overview', onSignOut }) => {
    const [activeTab, setActiveTab] = useState<Tab>(initialTab as Tab);
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    // NEW: Sync active tab to storage for reload persistence
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('voyageur_dashboard_active_tab', activeTab);
        }
    }, [activeTab]);
    const [activeSettingsTab, setActiveSettingsTab] = useState('account');
    const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const tabContainerRef = useRef<HTMLDivElement | null>(null);

    // BULLETPROOF HYDRATION STRATEGY
    // 1. Initialize with cached stats if available (fast read) - USER SPECIFIC
    // 2. If no cache, calculate from cached trips synchronously (instant)
    // 3. Hydrate/Calculate fully in background (DATA FRESHNESS)
    const [stats, setStats] = useState<any>(() => {
        // User-specific stats cache key
        const userStatsKey = user?.id ? `${STORAGE_KEYS.STATS}_${user.id} ` : null;

        // Try direct stats cache (user-specific only)
        if (userStatsKey) {
            const cached = getLocal(userStatsKey, null);
            if (cached) return cached;
        }

        // Fallback: Calculate from cached trips instantly
        if (user?.id) {
            const cachedTrips = getLocal(getTripsKey(user.id), []);
            const userTrips = cachedTrips.filter((t: any) => t.user_id === user.id);

            if (userTrips.length > 0) {
                // 1. Calculate Active/Completed for Stats
                const active = userTrips.filter((t: any) => t.status === 'confirmed' || t.status === 'completed');

                // 2. Identify Ongoing/Paused for Display (Sorted by Urgency)
                const ongoingTrips = userTrips.filter((t: any) => t.status === 'confirmed' || t.status === 'paused');

                // Sort Logic:
                const now = new Date();
                const todayCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                ongoingTrips.sort((a: any, b: any) => {
                    const dateA = a.startDate || a.data?.startDate;
                    const dateB = b.startDate || b.data?.startDate;

                    const timeA = dateA ? new Date(dateA).getTime() : 0;
                    const timeB = dateB ? new Date(dateB).getTime() : 0;

                    const isFutureA = timeA >= todayCurrent;
                    const isFutureB = timeB >= todayCurrent;

                    if (isFutureA && isFutureB) return timeA - timeB; // Both future: soonest first
                    if (isFutureA) return -1; // Only A is future
                    if (isFutureB) return 1;  // Only B is future
                    return (b.updated_at || 0) - (a.updated_at || 0); // Both past/none: newest update first
                });

                // 3. Calculate Spend
                let spend = 0;
                userTrips.forEach((t: any) => {
                    const history = t.data?.completionHistory;
                    if (history && Array.isArray(history) && history.length > 0) {
                        history.forEach((c: string) => {
                            const m = c?.match?.(/[\d,]+/);
                            if (m) spend += parseFloat(m[0].replace(/,/g, ''));
                        });
                    }
                    if (t.status === 'completed') {
                        const cs = t.total_cost || t.data?.totalEstimatedCost || '';
                        const m = cs.match?.(/[\d,]+/);
                        if (m) spend += parseFloat(m[0].replace(/,/g, ''));
                    }
                });

                if (active.length > 0 || ongoingTrips.length > 0) {
                    return {
                        recentTrips: ongoingTrips, // Only ongoing trips for display
                        totalCompletions: active.filter((t: any) => t.status === 'completed').length,
                        totalSpend: spend,
                        citiesVisited: new Set(active.filter((t: any) => t.status === 'completed').map((t: any) => t.destination?.toLowerCase().split(',')[0].trim()).filter(Boolean)).size,
                        dna: { Adventure: 25, Luxury: 25, Culture: 25, Relaxation: 25 }
                    };
                }
            }
        }
        return DEFAULT_STATS;
    });

    const [hydrated, setHydrated] = useState(false);


    // Google Calendar Connection State
    const [isGCalConnected, setIsGCalConnected] = useState(false);
    // Gmail Connection State (Simulated/Persistent)
    const [isGmailConnected, setIsGmailConnected] = useState(false);

    useEffect(() => {
        // Handle OAuth redirect first (if returning from Google auth)
        const wasRedirected = googleCalendarService.handleRedirect();
        if (wasRedirected) {
            console.log('✅ [Dashboard] OAuth redirect handled, calendar now connected!');
            setIsGCalConnected(true);
        } else {
            // Check connection status
            // 1. Initial check (fast, might be stale)
            const fastCheck = googleCalendarService.isConnected();
            setIsGCalConnected(fastCheck);
            // 2. Strict Verification (async, ensures token works via API)
            // We do this to prevent false positives from stale local storage
            if (fastCheck) {
                googleCalendarService.verifyConnection().then(isValid => {
                    if (!isValid) {
                        console.log('⚠️ [Dashboard] Connection failed strict verification. Resetting.');
                        setIsGCalConnected(false);
                        // verifyConnection already calls disconnect() internally on 401/403
                        // but we ensure local state is consistent here
                    }
                });
            }
        }

        // Initialize Gmail State
        setIsGmailConnected(localStorage.getItem('voyageur_gmail_connected') === 'true');

        // Pre-load scripts for future use
        googleCalendarService.init().then(() => {
            console.log('✅ [Dashboard] Google scripts pre-loaded.');
        });

        const handleStorageChange = () => {
            setIsGCalConnected(googleCalendarService.isConnected());
            setIsGmailConnected(localStorage.getItem('voyageur_gmail_connected') === 'true');
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const [syncedFlags, setSyncedFlags] = useState<Record<string, boolean>>({}); // Instant visual override
    const [syncProgress, setSyncProgress] = useState<Record<string, string>>({}); // { tripId: "5/12" or "45%" }

    // Modal State for Calendar Sync Operations
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; trip: StoredTrip | null; eventCount: number }>({
        isOpen: false,
        trip: null,
        eventCount: 0
    });
    const [reconnectModal, setReconnectModal] = useState<{ isOpen: boolean; pendingAction: (() => Promise<void>) | null }>({
        isOpen: false,
        pendingAction: null
    });
    const [cancelModal, setCancelModal] = useState<{
        isOpen: boolean;
        tripId: string | null;
        destination: string | null;
        isLeaveAction?: boolean;
        message?: string;
        isOwner?: boolean;
        promptId?: string;
    }>({
        isOpen: false,
        tripId: null,
        destination: null
    });

    const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; id: number } | null>(null);
    // Helper to show toast with auto-generated unique id
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        setToastMessage({ message, type, id: Date.now() });
    };
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [showSpendBreakdown, setShowSpendBreakdown] = useState(false);
    const [showVoyagerPoints, setShowVoyagerPoints] = useState(false);
    const [showCarbonOffset, setShowCarbonOffset] = useState(false);
    const [showCitiesUnlocked, setShowCitiesUnlocked] = useState(false);
    const [showTravelDNA, setShowTravelDNA] = useState(false);
    const [showIntegrations, setShowIntegrations] = useState(false);
    const [generatingToast, setGeneratingToast] = useState<{ destination: string } | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [successToast, setSuccessToast] = useState<{ destination: string; tripId?: string; promptId?: string } | null>(null);
    const [successToastVisible, setSuccessToastVisible] = useState(false);
    const [convertingId, setConvertingId] = useState<string | null>(null);

    // Social Sharing State
    const [sharingCity, setSharingCity] = useState<{ name: string, count: number, country?: string } | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [shareBlob, setShareBlob] = useState<Blob | null>(null);
    const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Interactive Share Editor State
    const [isEditingShare, setIsEditingShare] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: -50 }); // Default relative position
    // NEW: Phase 3 Controls
    const [overlayScale, setOverlayScale] = useState(1);
    const [overlayTheme, setOverlayTheme] = useState<'cyan' | 'white' | 'orange' | 'emerald'>('cyan');
    // NEW: Phase 4 Controls (Cinematic Toggles & Filters)
    const [showLogo, setShowLogo] = useState(true);
    const [showTitle, setShowTitle] = useState(true);
    const [showStats, setShowStats] = useState(true);
    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null);
    const [imageFilter, setImageFilter] = useState<'none' | 'grayscale' | 'sepia' | 'blur'>('none');

    // Name editing state
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.fullName || '');

    // Upcoming Missions Dropdown State
    const [upcomingOpen, setUpcomingOpen] = useState(false);

    // --- MISSION CONTROL LOGIC ---
    // Timer logic moved to MissionControlHeader component to prevent dashboard re-renders.




    // Sync local state when user prop updates (Fix: Settings input shows old name)
    useEffect(() => {
        if (user?.fullName) {
            setNewName(user.fullName);
        }
    }, [user?.fullName]);

    // Unified Toast Handler (Event Driven)
    useEffect(() => {
        const handleToast = () => {
            const pending = localStorage.getItem('voyageur_pending_toast');
            if (pending) {
                // Remove immediately to prevent duplicate toasts on remount
                localStorage.removeItem('voyageur_pending_toast');
                try {
                    const data = JSON.parse(pending);

                    if (data.type === 'generating' && data.destination) {
                        setGeneratingToast({ destination: data.destination });
                        setTimeout(() => setToastVisible(true), 50);
                        setTimeout(() => {
                            setToastVisible(false);
                            setTimeout(() => setGeneratingToast(null), 400);
                        }, 5000);
                    }
                    else if (data.type === 'success' && data.destination) {
                        setSuccessToast({ destination: data.destination, tripId: data.tripId, promptId: data.promptId });
                        setTimeout(() => setSuccessToastVisible(true), 50);
                        setTimeout(() => {
                            setSuccessToastVisible(false);
                            setTimeout(() => setSuccessToast(null), 400);
                        }, 8000);
                    }
                    else if (data.type === 'error' && data.destination) {
                        setErrorToast({ destination: data.destination, message: data.message });
                        setTimeout(() => setErrorToastVisible(true), 50);
                        setTimeout(() => {
                            setErrorToastVisible(false);
                            setTimeout(() => setErrorToast(null), 400);
                        }, 6000);
                    }
                } catch (e) { console.warn('Failed to parse pending toast:', e); }
            }
        };

        // Check on mount
        handleToast();

        // Listen for events
        window.addEventListener('voyageur:toast', handleToast);
        return () => window.removeEventListener('voyageur:toast', handleToast);
    }, []);

    // Error toast state
    const [errorToast, setErrorToast] = useState<{ destination: string; message: string } | null>(null);
    const [errorToastVisible, setErrorToastVisible] = useState(false);

    // Toast auto-dismiss
    const [toastAnimated, setToastAnimated] = useState(false);
    useEffect(() => {
        if (toastMessage) {
            setToastAnimated(false); // Reset on new toast
            // Slight delay before marking as animated to let animation start
            const animTimer = setTimeout(() => setToastAnimated(true), 100);
            const dismissTimer = setTimeout(() => setToastMessage(null), 4000);
            return () => { clearTimeout(animTimer); clearTimeout(dismissTimer); };
        }
    }, [toastMessage?.id]); // Depend on ID to catch same-message toasts

    // Lock body scroll when any stat modal is open
    useEffect(() => {
        if (showSpendBreakdown || showVoyagerPoints || showCarbonOffset || showCitiesUnlocked || showTravelDNA) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showSpendBreakdown, showVoyagerPoints, showCarbonOffset, showCitiesUnlocked, showTravelDNA]);

    // Debugging render
    // console.log("Dashboard Render. Stats valid:", !!stats);

    // --- SOCIAL SHARING LOGIC ---
    const handleShareClick = (cityData: { name: string, count: number, country?: string }) => {
        setSharingCity(cityData);
        setIsSharing(true);
        // Trigger file input instead of immediate sharing
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setIsSharing(false);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setUploadedImage(event.target.result as string);
                setIsEditingShare(true); // Open the Editor instead of auto-generating
                setIsSharing(false); // Stop the initial loader
            }
        };
        reader.readAsDataURL(file);
    };

    // Helper function to extract cropped image (Canvas draw)
    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
        const image = new Image();
        image.src = imageSrc;
        await new Promise((resolve) => (image.onload = resolve));

        const canvas = document.createElement("canvas");
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) return imageSrc;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return canvas.toDataURL('image/jpeg', 0.9);
    };

    // Fetch map data for the selected city or mission location when sharing
    useEffect(() => {
        if (isEditingShare && sharingCity) {
            // First get simple center coordinates for TomTom map
            // Append explicit country information to prevent TomTom resolving to an obscure
            // village with the same name on the other side of the planet (e.g. Mangalore, Victoria vs Mangalore, India)
            const query = sharingCity.country ? `${sharingCity.name}, ${sharingCity.country}` : sharingCity.name;

            // Hardcoded override for Mangalore since TomTom defaults to Seymour, Australia
            if (query.toLowerCase().includes('mangalore')) {
                setMapCenter({ lat: 12.9141, lng: 74.8560 });
                return;
            }

            geocodePlace(query).then((res) => {
                if (res) {
                    setMapCenter({ lat: res.lat, lng: res.lng });
                } else {
                    setMapCenter(null);
                }
            }).catch(() => {
                setMapCenter(null);
            });
        } else {
            setMapCenter(null);
        }
    }, [isEditingShare, sharingCity]);

    const generateShareCanvas = async () => {
        setIsSharing(true);
        try {
            // Give React a tick to mount the hidden block
            await new Promise(r => setTimeout(r, 100));

            const cardElement = document.getElementById('voyageur-share-card');
            const userImgElement = document.getElementById('voyageur-share-img') as HTMLImageElement;
            if (!cardElement) throw new Error("Share node not found");

            // Ensure the image is actually loaded in the DOM before we attempt to screenshot it
            if (userImgElement && !userImgElement.complete) {
                await new Promise((resolve, reject) => {
                    userImgElement.onload = resolve;
                    userImgElement.onerror = reject;
                    // Failsafe timeout
                    setTimeout(resolve, 3000);
                });
            }

            // Temporarily unhide for rendering and force strict viewport placement
            // html-to-image requires elements to be properly in flow or visually defined,
            // otherwise the SVG <foreignObject> collapses or captures blank space.
            cardElement.style.top = '0px';
            cardElement.style.left = '0px';
            cardElement.style.opacity = '1';
            cardElement.style.zIndex = '-9999'; // Keep it behind the editor UI
            cardElement.style.pointerEvents = 'none';

            const blob = await toBlob(cardElement, {
                pixelRatio: 2, // High resolution
                cacheBust: true,
                width: 1080,
                height: 1920,
                canvasWidth: 1080,
                canvasHeight: 1920,
                backgroundColor: '#111418', // Fallback to voyageur dark
                // These specific property bypasses allow html-to-image to run cross-origin locally
                fontEmbedCSS: '',
                imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                style: { margin: '0' }
            });

            // Restore hidden state
            cardElement.style.top = '-10000px';
            cardElement.style.left = '-10000px';
            cardElement.style.opacity = '0';

            if (!blob) throw new Error("Image render failed");
            setShareBlob(blob);
            setSharePreviewUrl(URL.createObjectURL(blob));
            setIsEditingShare(false); // Close Editor, show final preview

        } catch (error) {
            console.error("Failed to share:", error);
            showToast("Failed to generate share metric.", "error");
            setIsSharing(false);
        }
    };

    // --- MISSION HANDLERS (Direct LocalStorage Access since trips var is elusive) ---
    const handleFreezeMission = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        let storedTrips = [];
        try {
            if (user?.id) {
                storedTrips = JSON.parse(localStorage.getItem(getTripsKey(user.id)) || '[]');
            }
        } catch (err) {
            console.error('Failed to parse trips from localStorage:', err);
            return;
        }
        const updatedTrips = storedTrips.map((t: any) => {
            if (t.id === id) {
                // Store the freeze timestamp so we can calculate pause duration later
                const updatedData = { ...t.data, last_frozen_at: Date.now(), status: 'paused' };
                return { ...t, status: 'paused', data: updatedData, updated_at: Date.now() };
            }
            return t;
        });
        if (user?.id) {
            localStorage.setItem(getTripsKey(user.id), JSON.stringify(updatedTrips));
        }

        // Force update stats
        setStats((prev: any) => {
            if (!prev) return prev;
            const updatedRecent = prev.recentTrips?.map((t: any) =>
                t.id === id ? { ...t, status: 'paused', data: { ...t.data, last_frozen_at: Date.now(), status: 'paused' } } : t
            );
            return { ...prev, recentTrips: updatedRecent };
        });
        showToast("Mission Frozen. Time locked.", 'info');
    };

    const handleResumeMission = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const storedTrips = JSON.parse(localStorage.getItem(getTripsKey(user.id)) || '[]');
            const updatedTrips = storedTrips.map((t: any) => {
                if (t.id === id) {
                    // Time Warp: Shift startDate forward by pause duration
                    const frozenAt = t.data?.last_frozen_at || Date.now();
                    const pauseDuration = Date.now() - frozenAt;
                    const newStartDate = new Date(new Date(t.startDate).getTime() + pauseDuration).toISOString();
                    const updatedData = { ...t.data, status: 'confirmed', startDate: newStartDate };

                    return {
                        ...t,
                        status: 'confirmed',
                        startDate: newStartDate,
                        data: updatedData,
                        updated_at: Date.now()
                    };
                }
                return t;
            });
            localStorage.setItem(getTripsKey(user.id), JSON.stringify(updatedTrips));

            setStats((prev: any) => {
                if (!prev) return prev;
                const updatedRecent = prev.recentTrips?.map((t: any) => {
                    if (t.id === id) {
                        const frozenAt = t.data?.last_frozen_at || Date.now();
                        const pauseDuration = Date.now() - frozenAt;
                        const newStartDate = new Date(new Date(t.startDate).getTime() + pauseDuration).toISOString();
                        return { ...t, status: 'confirmed', startDate: newStartDate, data: { ...t.data, status: 'confirmed', startDate: newStartDate } };
                    }
                    return t;
                });
                return { ...prev, recentTrips: updatedRecent };
            });
            showToast("Mission Resumed. Time warped to present.", 'success');
        } catch (e) { console.error(e); }
    };

    const handleCancelRequest = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const trip = ongoingTrips.find(t => t.id === id);
        setCancelModal({
            isOpen: true,
            tripId: id,
            destination: trip?.destination || 'this mission'
        });
    };

    const handleLeaveMission = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        console.log(`📡[Dashboard] handleLeaveMission triggered for trip: ${id} `);
        if (!user || !id) return;

        const trip = trips.find(t => t.id === id);
        const isOwner = trip?.user_id === user.id;
        const promptId = trip?.promptId || trip?.data?.promptId;

        const confirmMsg = isOwner
            ? "Are you sure you want to delete this mission? This action cannot be undone."
            : "Are you sure you want to leave this mission? You will be removed from the squad.";

        setCancelModal({
            isOpen: true,
            tripId: id,
            destination: trip?.destination || 'this mission',
            isLeaveAction: true,
            message: confirmMsg,
            isOwner: isOwner,
            promptId: promptId
        });
    };

    const confirmLeaveMission = async () => {
        const id = cancelModal.tripId;
        const isOwner = cancelModal.isOwner;
        const promptId = cancelModal.promptId;

        setCancelModal({ isOpen: false, tripId: null, destination: null });
        if (!user || !id) return;

        // 1. Optimistic update (Immediate UI)
        setTrips(prev => prev.filter(t => t.id !== id));
        if (promptId) {
            setPrompts(prev => prev.filter(p => p.id !== promptId));
        }

        // 2. Synchronize LocalStorage (Prevent re-hydration from old cache)
        try {
            const key = getTripsKey(user.id);
            const cached = getLocal(key, []);
            const filtered = cached.filter((t: any) => t.id !== id);
            setLocal(key, filtered);
        } catch (err) {
            console.error("Failed to sync localStorage after leaving/deleting mission:", err);
        }

        // 3. Persistent removal
        let success = false;
        try {
            if (isOwner) {
                // Owner: DESTROY the trip record
                success = await dbService.deleteTrip(user.id, id);
            } else {
                // Guest: Leave the Squad (Remove from squad_members)
                success = await dbService.leaveSquad(user.id, id);
            }

            // Cleanup associated prompt if it exists
            if (promptId) {
                console.log(`📡[Dashboard] Cleaning up associated prompt: ${promptId} `);
                await dbService.deletePrompt(user.id, promptId);
            }
        } catch (err) {
            console.error("Failed to remove mission from DB:", err);
            success = false;
        }

        console.log(`📡[Dashboard] Removal success: ${success}. Final trips state count: ${trips.length - 1} `);

        if (success) {
            showToast(isOwner ? "Mission deleted." : "Mission abandoned.", 'info');
            setStats((prev: any) => ({
                ...prev,
                recentTrips: prev.recentTrips?.filter((t: any) => t.id !== id)
            }));
        } else {
            showToast("Action failed. Connection error.", 'error');
        }
    };

    const confirmCancelMission = () => {
        const id = cancelModal.tripId;
        if (id && user?.id) {
            setCancelModal({ isOpen: false, tripId: null, destination: null });
            // 1. Optimistic State Update (Immediate)
            setTrips(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t));

            dbService.updateTripStatus(user.id, id, 'cancelled').then(() => {
                setStats((prev: any) => ({
                    ...prev,
                    recentTrips: prev.recentTrips?.map((t: any) => t.id === id ? { ...t, status: 'cancelled' } : t)
                }));
                showToast("Mission cancelled.", 'info');
            });
        }
    };

    const handleCompleteMission = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // 1. Optimistic State Update (Immediate)
        setTrips(prev => prev.map(t => t.id === id ? { ...t, status: 'completed', updated_at: Date.now() } : t));

        // 2. Persistent Storage Update
        const storedTrips = user?.id ? JSON.parse(localStorage.getItem(getTripsKey(user.id)) || '[]') : [];
        let completedTrip: any = null;
        const updatedTrips = storedTrips.map((t: any) => {
            if (t.id === id) {
                const updatedData = { ...t.data, status: 'completed' };
                completedTrip = { ...t, status: 'completed', data: updatedData, updated_at: Date.now(), completed_at: Date.now() };
                return completedTrip;
            }
            return t;
        });
        if (user?.id) {
            localStorage.setItem(getTripsKey(user.id), JSON.stringify(updatedTrips));
        }

        // Sync to Supabase
        if (user?.id) {
            dbService.updateTripStatus(user.id, id, 'completed');

            // Also update the associated prompt log status
            const promptId = completedTrip?.promptId || completedTrip?.data?.promptId;
            if (promptId) {
                dbService.updatePrompt(user.id, promptId, { status: 'completed' });
            }
        }

        // Update stats state directly
        setStats((prev: any) => {
            if (!prev) return prev;
            const updatedRecent = prev.recentTrips?.filter((t: any) => t.id !== id);
            return {
                ...prev,
                recentTrips: updatedRecent,
                totalCompletions: (prev.totalCompletions || 0) + 1,
                citiesVisited: prev.citiesVisited + 1
            };
        });
        showToast("Mission Completed! New intel acquired.", 'success');
    };

    const handleCardSync = async (e: React.MouseEvent, trip: StoredTrip) => {
        e.stopPropagation();

        // Prevent double-click on SAME trip, but allow others
        if (syncingIds[trip.id]) return;

        // Check sync status using flag override or data
        const isSynced = syncedFlags[trip.id] ?? ((trip.data?.calendarEventIds?.length || 0) > 0);

        // 1. DELETE FLOW - Show confirmation modal instead of window.confirm
        if (isSynced) {
            const eventIds = trip.data?.calendarEventIds || [];

            if (eventIds.length > 0 || syncedFlags[trip.id]) {
                // GUARD: If flag is set (Visual Green) but IDs are missing (Data Stale), show toast
                if (eventIds.length === 0) {
                    showToast("Sync data is finishing... please wait and try again.", 'warning');
                    return;
                }

                // Open delete confirmation modal
                setDeleteModal({ isOpen: true, trip, eventCount: eventIds.length });
                return;
            }
        }

        // 2. CREATE FLOW - Direct execution with reconnect modal fallback
        await executeCreateSync(trip);
    };

    // Handler for delete confirmation (called from modal)
    const executeDeleteSync = async (trip: StoredTrip) => {
        const eventIds = trip.data?.calendarEventIds || [];

        // IMMEDIATELY close modal and switch to overview tab
        setDeleteModal({ isOpen: false, trip: null, eventCount: 0 });
        setActiveTab('overview');

        // Start the deletion process (progress will show on the trip card)
        setSyncingIds(prev => ({ ...prev, [trip.id]: true }));
        setSyncProgress(prev => ({ ...prev, [trip.id]: "0%" }));

        const onDelProgress = (c: number, t: number) => {
            const pct = Math.round((c / t) * 100);
            setSyncProgress(prev => ({ ...prev, [trip.id]: `${pct}% ` }));
        };

        let result = await googleCalendarService.deleteTripEvents(eventIds, onDelProgress);

        // Auto-Reconnect Handler
        if (!result.success && (result.error === 'Not connected' || result.error?.includes('connected'))) {
            // Store the pending action and show reconnect modal
            setReconnectModal({
                isOpen: true,
                pendingAction: async () => {
                    const connected = await googleCalendarService.connect();
                    if (connected) {
                        setIsGCalConnected(true);
                        await executeDeleteSync(trip);
                    }
                }
            });
            return;
        }

        if (result.success) {
            // Optimistic UI Update (Immediate)
            setSyncedFlags(prev => ({ ...prev, [trip.id]: false }));

            const updatedTrip = { ...trip.data, calendarEventIds: [] };
            const tripId = trip.id; // Capture ID

            setStats(prev => ({
                ...prev,
                recentTrips: prev.recentTrips.map(t =>
                    t.id === tripId ? { ...t, data: updatedTrip } : t
                )
            }));
            setSyncingIds(prev => { const n = { ...prev }; delete n[tripId]; return n; });
            setSyncProgress(prev => { const n = { ...prev }; delete n[tripId]; return n; });

            // CRITICAL FIX: Update trips state here too
            setTrips(prev => prev.map(t =>
                t.id === tripId ? { ...t, data: updatedTrip } : t
            ));

            if (user?.id) {
                await dbService.updateTrip(user.id, trip.id, updatedTrip);
            }
            showToast("Events removed from calendar!", 'success');
        } else {
            showToast("Failed to delete events: " + result.error, 'error');
            setSyncingIds(prev => { const n = { ...prev }; delete n[trip.id]; return n; });
            setSyncProgress(prev => { const n = { ...prev }; delete n[trip.id]; return n; });
        }
    };

    // Handler for create sync
    const executeCreateSync = async (trip: StoredTrip) => {
        setSyncingIds(prev => ({ ...prev, [trip.id]: true }));
        setSyncProgress(prev => ({ ...prev, [trip.id]: "Starting..." }));

        let result = await googleCalendarService.createTripEvent(trip, (current, total) => {
            const pct = Math.round((current / total) * 100);
            setSyncProgress(prev => ({ ...prev, [trip.id]: `${pct}% ` }));
        });

        // Auto-Reconnect Handler (Create)
        if (!result.success && (result.error === 'Calendar not connected' || result.error?.includes('connected'))) {
            // Store the pending action and show reconnect modal
            setReconnectModal({
                isOpen: true,
                pendingAction: async () => {
                    const connected = await googleCalendarService.connect();
                    if (connected) {
                        setIsGCalConnected(true);
                        await executeCreateSync(trip);
                    }
                }
            });
            return;
        }

        if (result.success && result.eventIds && result.eventIds.length > 0) {
            // SUCCESS: Instant Optimistic UI Update
            setSyncedFlags(prev => ({ ...prev, [trip.id]: true }));

            const updatedTrip = { ...trip.data, calendarEventIds: result.eventIds };
            const tripId = trip.id; // Capture ID

            setStats(prev => ({
                ...prev,
                recentTrips: prev.recentTrips.map(t =>
                    t.id === tripId ? { ...t, data: updatedTrip } : t
                )
            }));

            // CRITICAL FIX: Update the 'trips' state which drives the ongoingTrips UI
            setTrips(prev => prev.map(t =>
                t.id === tripId ? { ...t, data: updatedTrip } : t
            ));

            setSyncingIds(prev => { const n = { ...prev }; delete n[tripId]; return n; });
            setSyncProgress(prev => { const n = { ...prev }; delete n[tripId]; return n; });

            dbService.updateTrip(user!.id, trip.id, updatedTrip).catch(err => {
                console.error("Background DB save failed:", err);
            });

            showToast("Trip synced to calendar!", 'success');

        } else if (result) {
            console.error('❌ Sync failed:', result.error);
            setSyncingIds(prev => ({ ...prev, [trip.id]: false }));
            showToast(`Sync Failed: ${result.error || 'No events created'} `, 'error');
            setSyncProgress(prev => { const n = { ...prev }; delete n[trip.id]; return n; });
            setSyncingIds(prev => { const n = { ...prev }; delete n[trip.id]; return n; });
        }
    };

    // ... loop ...
    // Inside map
    // This part is not in the provided code snippet, but it's where the `isSynced` variable would be used in JSX.
    // Assuming a structure like:
    // {stats?.recentTrips?.map((trip: StoredTrip) => {
    //     const isSynced = syncedFlags[trip.id] ?? ((trip.data?.calendarEventIds?.length || 0) > 0);
    //     return (
    //         <div key={trip.id} className="relative p-4 bg-zinc-900 border border-white/10 rounded-lg flex flex-col justify-between hover:border-cyan-400/50 transition-colors cursor-pointer"
    //             onClick={() => onLoadTrip(trip)}>
    //             <div className="flex justify-between items-start mb-2">
    //                 <h3 className="text-lg font-bold text-white">{trip.destination}</h3>
    //                 <div className="flex items-center gap-2">
    //                     <button
    //                         onClick={(e) => handleCardSync(e, trip)}
    //                         className={`flex items-center justify-center min-w-[40px] h-10 px-2 border transition-all duration-300 rounded-sm ${isSynced
    //                             ? "text-emerald-400 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20"
    //                             }`}
    //                         title={isSynced ? "Synced! Click to delete." : "Sync to Google Calendar"}
    //                     >
    //                         {syncingTripId === trip.id ? (
    //                             <div className="flex items-center gap-2">
    //                                 <Loader2 className="w-3 h-3 animate-spin" />
    //                                 <span className="text-[10px] font-mono">{syncProgress[trip.id] || '...'}</span>
    //                             </div>
    //                         ) : (
    //                             isSynced ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />
    //                         )}
    //                     </button>
    //                 </div>
    //             </div>
    //             {/* ... other trip details ... */}
    //         </div>
    //     );
    // })}

    // Hydrate from localStorage ONCE (sync) - USER SPECIFIC
    useEffect(() => {
        // User-specific stats cache key
        const userStatsKey = user?.id ? `${STORAGE_KEYS.STATS}_${user.id}` : null;

        if (userStatsKey) {
            const cached = getLocal(userStatsKey, null);
            if (cached) {
                setStats(cached);
            } else {
                // INSTANT: Calculate stats from cached trips if no stats cache exists
                const cachedTrips = user?.id ? getLocal(getTripsKey(user.id), []) : [];
                // Include joined trips so guests can see their cities visited and stats
                const userTrips = cachedTrips.filter((t: any) => t.user_id === user?.id || t.is_joined || t.data?.is_joined);
                const completedTrips = userTrips.filter((t: any) => t.status === 'completed');
                const activeTrips = userTrips.filter((t: any) => t.status === 'confirmed' || t.status === 'completed' || t.status === 'paused');

                let totalSpend = 0;
                let totalCompletions = 0;
                userTrips.forEach((t: any) => {
                    const history = t.data?.completionHistory;
                    if (history && Array.isArray(history)) {
                        // Sum history spend and count
                        history.forEach((costStr: string) => {
                            const match = costStr?.match?.(/[\d,]+/);
                            if (match) totalSpend += parseFloat(match[0].replace(/,/g, ''));
                        });
                        totalCompletions += history.length;
                    }
                    if (t.status === 'completed') {
                        const costStr = t.total_cost || t.data?.totalEstimatedCost || '';
                        const match = costStr.match?.(/[\d,]+/);
                        if (match) totalSpend += parseFloat(match[0].replace(/,/g, ''));
                        totalCompletions += 1;
                    }
                });

                if (activeTrips.length > 0) {
                    setStats({
                        totalSpend: Math.round(totalSpend),
                        tripCount: activeTrips.length,
                        totalCompletions: totalCompletions,
                        citiesVisited: new Set(completedTrips.map((t: any) => t.destination?.toLowerCase()).filter(Boolean)).size,
                        recentTrips: activeTrips
                    });
                } else {
                    // No trips for this user - show defaults
                    setStats(DEFAULT_STATS);
                }
            }
        } else {
            // No user - show defaults
            setStats(DEFAULT_STATS);
        }
        // Delay to allow scramble effect to play on Dashboard load
        setTimeout(() => setHydrated(true), 1000);
    }, [user?.id]);

    // ... (existing code)



    const [prompts, setPrompts] = useState<any[]>(() => {
        // Immediate load on mount (no waiting for interval)
        if (!user?.id || typeof localStorage === 'undefined') return [];
        const cached = user?.id ? JSON.parse(localStorage.getItem(getPromptsKey(user.id)) || '[]') : [];
        const deletedIds = JSON.parse(localStorage.getItem('voyageur_deleted_prompts') || '[]');

        return cached
            .filter((p: any) => p.user_id === user.id && !deletedIds.includes(p.id))
            .sort((a: any, b: any) => b.created_at - a.created_at);
    });

    // Poll prompts for status changes (background generation updates)
    // Polling Removed: Data updates are now Event-Driven (voyageur:db-update)

    // FIX: Initialize trips with cached data synchronously for instant load
    const [trips, setTrips] = useState<any[]>(() => {
        if (!user?.id) return [];
        const cached = getLocal(getTripsKey(user.id), []);
        // Filter for current user (either owned or joined) and sort by newest
        return cached.filter((t: any) => t.user_id === user.id || t.is_joined || t.data?.is_joined)
            .sort((a: any, b: any) => b.created_at - a.created_at);
    });

    // State to track if we have successfully synced with the server
    // This prevents "Fake Confirmed" joined trips (which are locally confirmed but server drafts) from flickering
    const [hasFetched, setHasFetched] = useState(false);
    const [userRoles, setUserRoles] = useState<Record<string, string>>({});

    // Use trips directly for active mission (Single Source of Truth)
    // Replicates the "Closest Upcoming" sort logic to ensure we show the right mission
    const ongoingTripsSorted = useMemo(() => {
        if (!trips || trips.length === 0) return [];

        const ongoing = trips.filter((t: any) =>
            (t.status === 'confirmed' || t.status === 'paused') &&
            // ANTI-GLITCH: Don't show joined trips until we've verified with server
            // (Local storage often has them as 'confirmed' due to optimistic join logic)
            (!(t.is_joined || t.data?.is_joined) || hasFetched)
        );
        if (ongoing.length === 0) return [];

        const now = new Date();
        const todayCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        return [...ongoing].sort((a: any, b: any) => {
            const dateA = a.startDate || a.data?.startDate;
            const dateB = b.startDate || b.data?.startDate;

            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;

            const isFutureA = timeA >= todayCurrent;
            const isFutureB = timeB >= todayCurrent;

            if (isFutureA && isFutureB) return timeA - timeB; // Both future: soonest first
            if (isFutureA) return -1; // Only A is future
            if (isFutureB) return 1;  // Only B is future
            return (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0);
        });
    }, [trips, hasFetched]);

    const activeMission = useMemo(() => ongoingTripsSorted[0] || null, [ongoingTripsSorted]);

    const isActiveAdmin = useMemo(() => {
        if (!activeMission || !user) return false;
        // Owners or Captains are admins
        if (activeMission.user_id === user.id) return true;
        const role = userRoles[activeMission.id];
        return role === 'Captain' || role === 'Admin';
    }, [activeMission, user, userRoles]);


    const firstName = (user?.fullName ? String(user.fullName) : 'Traveler').split(' ')[0];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'prompts', label: 'Prompt Log', icon: History },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    // Tab indicator - recalculate after hydration and on tab change (with ResizeObserver for robustness)
    const [isIndicatorReady, setIsIndicatorReady] = useState(false);
    const isIntroRef = useRef(true);

    useLayoutEffect(() => {
        if (!hydrated) return;

        const activeEl = tabsRef.current[activeTab];
        const container = tabContainerRef.current;
        if (!activeEl || !container) return;

        const measure = () => {
            const activeRect = activeEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            // Calculate relative position accounting for container scroll/border
            const relativeLeft = activeRect.left - containerRect.left - (container.clientLeft || 0);

            // 🟢 INTRO ANIMATION
            if (isIntroRef.current) {
                // CASE 1: Overview (first tab)
                if (activeTab === 'overview') {
                    // Start collapsed at overview
                    setIndicatorStyle({
                        left: 0,
                        width: 0
                    });

                    requestAnimationFrame(() => {
                        setIsIndicatorReady(true);
                        setIndicatorStyle({
                            left: 0,
                            width: activeRect.width
                        });
                    });
                }
                // CASE 2: Any other tab → slide
                else {
                    setIndicatorStyle({
                        left: 0,
                        width: activeRect.width
                    });

                    requestAnimationFrame(() => {
                        setIsIndicatorReady(true);
                        setIndicatorStyle({
                            left: relativeLeft,
                            width: activeRect.width
                        });
                    });
                }

                isIntroRef.current = false;
                return;
            }

            // 🟢 NORMAL TAB SWITCH (position + width)
            setIndicatorStyle({
                left: relativeLeft,
                width: activeRect.width
            });
        };

        // Initial measurement
        measure();

        // Watch for size changes
        const observer = new ResizeObserver(() => {
            requestAnimationFrame(measure);
        });
        observer.observe(activeEl);
        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, [activeTab, hydrated, tabContainerRef]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            // Parallelize fetching for maximum speed
            const [s, p, history, rolesData] = await Promise.all([
                dbService.getStats(user.id),
                dbService.getPrompts(user.id),
                dbService.getTrips(user.id),
                supabase.from('squad_members').select('trip_id, role').eq('user_id', user.id)
            ]);

            if (rolesData.data) {
                const roleMap = rolesData.data.reduce((acc: any, curr: any) => ({
                    ...acc,
                    [curr.trip_id]: curr.role
                }), {});
                setUserRoles(roleMap);
            }

            console.log(`📡 [Dashboard] fetchData completed. Trips fetched: ${history?.length}, Recent Deletions count: ${localStorage.getItem('voyageur_deleted_ids_v2') ? Object.keys(JSON.parse(localStorage.getItem('voyageur_deleted_ids_v2')!)).length : 0}`);

            setHasFetched(true); // MARK AS FETCHED

            // 1. Process Stats

            // 1. Process Stats with CLIENT-SIDE Sorting for Consistency
            if (s && history) {
                setStats((prev: any) => {
                    // Re-apply "Closest Upcoming" Sorting to fetched trips
                    // This ensures the Dashboard always shows the correct priority, overriding default DB sort
                    const ongoing = history.filter((t: any) => t.status === 'confirmed' || t.status === 'paused');
                    const now = new Date();
                    const todayCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                    ongoing.sort((a: any, b: any) => {
                        const dateA = a.startDate || a.data?.startDate;
                        const dateB = b.startDate || b.data?.startDate;

                        const timeA = dateA ? new Date(dateA).getTime() : 0;
                        const timeB = dateB ? new Date(dateB).getTime() : 0;

                        const isFutureA = timeA >= todayCurrent;
                        const isFutureB = timeB >= todayCurrent;

                        if (isFutureA && isFutureB) return timeA - timeB; // Both future: soonest first
                        if (isFutureA) return -1;
                        if (isFutureB) return 1;
                        return (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0);
                    });

                    // Overwrite the server-provided recentTrips (which might be just "newest created")
                    // with our smart-sorted list.
                    const updated = {
                        ...prev,
                        ...s,
                        recentTrips: ongoing
                    };

                    const userStatsKey = `${STORAGE_KEYS.STATS}_${user.id}`;
                    setLocal(userStatsKey, updated);
                    return updated;
                });
            }

            // 2. Process Prompts
            // dbService.getPrompts already handles merging local/remote and filtering deleted
            // So we can trust 'p' as the source of truth.
            if (p) {
                setPrompts(p);

                // Update local storage backup for offline/fast load
                if (p.length > 0 && user?.id) {
                    const key = getPromptsKey(user.id);
                    const allPrompts = JSON.parse(localStorage.getItem(key) || '[]');
                    const otherUsers = allPrompts.filter((px: any) => px.user_id !== user.id);
                    // We sort by created_at desc to be safe
                    const sorted = p.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    localStorage.setItem(key, JSON.stringify([...otherUsers, ...sorted]));
                }
            }

            // 3. Process Trips
            // Trust history from getTrips as it already merges local drafts/remote data.
            // Using a simple setter ensures deletions are reflected immediately.
            // We NO LONGER force drop completed guest trips here, because dbService needs them in the global state to calculate stats.
            // Instead, we filter them out in the useMemo hooks above (completedTrips and ongoingTripsSorted).
            const safeTrips = (history || []).filter((t: any) => !(t.status === 'cancelled' && (t.is_joined || t.data?.is_joined)));
            setTrips(safeTrips);

            if (user?.id) {
                setLocal(getTripsKey(user.id), safeTrips);
            }
        } catch (e) {
            console.error("Dashboard data load failed", e);
        }
    }, [user]);

    // 1. Fetch data on mount and updates
    useEffect(() => {
        fetchData();

        // Listen for LOCAL events
        window.addEventListener('voyageur:db-update', fetchData);
        window.addEventListener('voyageur:trip-update', fetchData);

        // Listen for REMOTE Realtime updates (Critical for Collaborative Handshake Visibility)
        const tripsChannel = supabase.channel('dashboard_trips_sync')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'trips'
            }, () => {
                console.log('🔄 [Dashboard] Remote trip update detected. Refreshing data...');
                fetchData();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'squad_members'
            }, () => {
                console.log('🔄 [Dashboard] Squad update detected. Refreshing data...');
                fetchData();
            })
            .subscribe();

        return () => {
            window.removeEventListener('voyageur:db-update', fetchData);
            window.removeEventListener('voyageur:trip-update', fetchData);
            supabase.removeChannel(tripsChannel);
        };
    }, [fetchData]);

    // 2. Clear state on User Change (Prevents flickering from previous user's data)
    useEffect(() => {
        if (!user?.id) {
            setTrips([]);
            setPrompts([]);
            setStats(null);
            setHasFetched(false);
            return;
        }

        // Reset fetch state to show loader/empty state while fetching new user data
        setHasFetched(false);
    }, [user?.id]);

    const handlePromptClick = async (item: any, options?: { skipDelay?: boolean }) => {
        if (!user || convertingId) return;

        if (item.type === 'trip') {
            // RESET LOGIC FOR DIRECT TRIP CLICKS
            // If the user clicks a trip that is completed/cancelled, we want to CLONE it into a new draft
            // instead of opening the history view of the old trip.
            if (item.status === 'completed' || item.status === 'cancelled') {
                console.log("🔄 [Dashboard] Cloning completed/cancelled trip to new draft:", item.id);

                // Clone data but strip ID and specific instance details
                const originalData = item.data || {};
                const newData = {
                    ...originalData,
                    status: 'draft',
                    // Preserve original prompt for regeneration context
                    originalPrompt: originalData.originalPrompt || item.destination,
                    // Clear old calendar events, etc.
                    calendarEventIds: []
                };

                // Create NEW Trip ID by saving as new draft
                // We do NOT pass an ID, forcing generation of a new one
                const newTripId = await dbService.saveTrip(user.id, newData, 'draft');

                // Construct wrapper for planner
                const newTripWrapper = {
                    id: newTripId,
                    user_id: user.id,
                    destination: item.destination,
                    status: 'draft',
                    created_at: new Date().toISOString(),
                    data: newData,
                    // We don't link promptId here unless we can find it, to avoid messy history linking
                    promptId: item.promptId
                };

                onLoadTrip(newTripWrapper);
                return;
            }

            // Normal behavior for active trips
            onLoadTrip(item);
            return;
        }

        if (item.status === 'ready' && item.result) {
            // Check if a TRIP already exists for this prompt to prevent duplicates
            // This handles cases where the filter might lag or user clicks faster than sync
            const existingTrip = trips.find(t => t.data?.promptId === item.id);

            // RESET LOGIC: If the existing trip is 'completed' or 'cancelled', we treat this as a "Re-Run"
            // and ignore the existing trip to create a FRESH one.
            if (existingTrip && existingTrip.status !== 'completed' && existingTrip.status !== 'cancelled') {
                console.log("🔗 [Dashboard] Redirecting prompt click to existing active trip:", existingTrip.id);
                onLoadTrip(existingTrip);
                return;
            }

            // The ITINERARY data (to be stored in the 'data' column)
            const itineraryData = {
                ...item.result,
                originalPrompt: item.prompt, // IMPORTANT: Preserve original prompt text
                destination: cleanDestination(item.destination || item.result?.destination),
                promptId: item.id // IMPORTANT: Persist promptId immediately for Draft linkage
            };

            // 1. Save as Draft Trip
            // saveTrip returns the generated ID from DB
            const tripId = await dbService.saveTrip(user.id, itineraryData);

            // 2. Construct the full Trip wrapper object expected by TripPlanner (with .data property)
            const newTripWrapper = {
                id: tripId,
                user_id: user.id,
                destination: cleanDestination(itineraryData.destination),
                status: 'draft',
                created_at: new Date().toISOString(),
                data: itineraryData,
                promptId: item.id // Pass the original prompt ID to link confirmation back to this log
            };

            // 3. Open in Planner (Do NOT delete the prompt log - let it persist)
            onLoadTrip(newTripWrapper);
        }
    };



    const ongoingTrips = useMemo(() => trips.filter(t => t.status === 'confirmed' || t.status === 'paused'), [trips]);
    // Separated active/upcoming vs history
    const completedTrips = useMemo(() => {
        // Drop any completed trips that belong to guests (is_joined) so they don't see it in history
        return trips.filter(t => t.status === 'completed' && !(t.is_joined || t.data?.is_joined));
    }, [trips]);

    // --- AUTO-COMPLETE LOGIC ---
    useEffect(() => {
        if (!ongoingTrips.length) return;

        const checkAndComplete = async () => {
            const now = new Date();
            // Unified UTC Time (Same as View Logic)
            const todayTime = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

            for (const trip of ongoingTrips) {
                // Unified Data Access (Same as View Logic)
                const startDate = trip.startDate || trip.data?.startDate;

                if (startDate) {
                    const startParts = startDate.split('-');
                    // Unified UTC Construction
                    const startTime = Date.UTC(
                        parseInt(startParts[0]),
                        parseInt(startParts[1]) - 1,
                        parseInt(startParts[2])
                    );

                    const diffTime = startTime - todayTime;
                    const daysUntilStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    const durationMatch = trip.duration ? trip.duration.match(/(\d+)/) : null;
                    const totalDays = durationMatch ? parseInt(durationMatch[0]) : 1;

                    // Calculate strict End Date: startTime + duration (as milliseconds)
                    // We add a 24-hour buffer (totalDays * 24h) to ensure the last day is fully complete.
                    // A 3-day trip starting Feb 1st (00:00) will end Feb 4th (00:00).
                    const endDate = startTime + (totalDays * 24 * 60 * 60 * 1000);
                    const now = Date.now();

                    // Trip is over?
                    if (now > endDate) {
                        console.log(`✅ [Auto-Complete] Trip to ${trip.destination} has finished (End: ${new Date(endDate).toLocaleDateString()}). Completing...`);

                        // 1. Optimistic Update
                        setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, status: 'completed' } : t));

                        // 2. Persist
                        if (user) {
                            await dbService.updateTripStatus(user.id, trip.id, 'completed');
                        }
                    }
                }
            }
        };

        // Debounce slightly to allow render to settle
        const timer = setTimeout(checkAndComplete, 1000);
        return () => clearTimeout(timer);
    }, [ongoingTrips, user]);

    // Extract unique cities from recent trips for the map
    const visitedCityNames = Array.from(new Set((stats?.recentTrips || []).map((t: any) => t?.destination).filter(Boolean))) as string[];

    // Extract unique cities (with their country) from recent trips for the map
    const visitedCityData = Array.from(new Map((stats?.recentTrips || [])
        .filter((t: any) => t?.destination)
        .map((t: any) => {
            const dest = t.destination;
            const parts = dest.split(',');
            const country = t.data?.country || (parts.length > 1 ? parts[parts.length - 1].trim() : '');
            const name = parts[0].trim();
            // Store using lowercased name as key to ensure uniqueness
            return [name.toLowerCase(), { name, country }];
        })
    ).values()) as { name: string, country: string }[];

    // --- SETTINGS STATE ---
    const [settings, setSettings] = useState(() => {
        try {
            const cached = localStorage.getItem('voyageur_settings_v1');
            return cached ? JSON.parse(cached) : {
                dietary: 'None',
                seat: 'Window',
                luxury: 3,
                darkMode: true,
                realTime: true,
                calendarSync: false
            };
        } catch {
            return {
                dietary: 'None',
                seat: 'Window',
                luxury: 3,
                darkMode: true,
                realTime: true,
                calendarSync: false
            };
        }
    });

    // Payment History State
    const [paymentHistory, setPaymentHistory] = useState<{
        id: string;
        credits_added: number;
        amount: number;
        status: string;
        created_at: string;
        provider: string;
    }[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    // Load settings from Supabase on mount (if user is logged in)
    useEffect(() => {
        const loadSettingsAndPayments = async () => {
            if (!user?.id) return;

            // Load settings from Supabase
            const supabaseSettings = await dbService.loadUserSettings(user.id);
            if (supabaseSettings) {
                setSettings(prev => {
                    const merged = { ...prev, ...supabaseSettings };
                    localStorage.setItem('voyageur_settings_v1', JSON.stringify(merged));
                    return merged;
                });
            }

            // Load payment history
            setLoadingPayments(true);
            const payments = await dbService.getPaymentHistory(user.id);
            setPaymentHistory(payments);
            setLoadingPayments(false);
        };

        loadSettingsAndPayments();
    }, [user?.id]);

    const updateSetting = async (key: string, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('voyageur_settings_v1', JSON.stringify(newSettings));

        // Also save to Supabase if user is logged in
        if (user?.id) {
            await dbService.saveUserSettings(user.id, {
                dietary: newSettings.dietary,
                luxury: newSettings.luxury,
                darkMode: newSettings.darkMode
            });
        }
    };

    const toggleSetting = (key: string) => {
        updateSetting(key, !settings[key]);
    }



    // Export trips to CSV
    const exportToCSV = () => {
        if (!trips || trips.length === 0) {
            alert('No trips to export');
            return;
        }

        // Helper to clean cost string - extract numeric value only
        const cleanCost = (cost: string | undefined) => {
            if (!cost) return '';
            // Extract just the first number from the cost string
            const match = cost.match(/[\d,]+/);
            return match ? `Rs ${match[0]}` : '';
        };

        // CSV headers
        const headers = ['Destination', 'Duration', 'Status', 'Estimated Cost'];

        // CSV rows - clean the data
        const rows = trips.map(trip => [
            cleanDestination(trip.destination),
            (trip.duration || '').trim(),
            (trip.status || 'draft').trim(),
            cleanCost(trip.total_cost)
        ]);

        // Combine headers and rows with proper escaping
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Add BOM for Excel to recognize UTF-8
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `voyageur_trips_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    // Don't render until hydrated from localStorage
    if (!hydrated) {
        return <div className="min-h-[101vh] bg-black" />;
    }

    return (
        <>
            {/* Spend Breakdown Modal */}
            {showSpendBreakdown && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-24"
                    onClick={() => setShowSpendBreakdown(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div
                        className="relative bg-black border border-white/20 p-8 max-w-lg w-full max-h-[70vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowSpendBreakdown(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-3">
                            <CreditCard className="w-6 h-6" /> Spend Breakdown
                        </h2>
                        <p className="text-zinc-500 text-sm mb-6">Your spending across all trips</p>

                        <div className="text-5xl font-bold text-emerald-400 mb-2">
                            ₹{(stats?.totalSpend || 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-zinc-500 mb-8">Total lifetime spend (completed trips only)</p>

                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Statement of Spend</h3>
                        <div className="space-y-3">
                            {(() => {
                                // Unified Spend List Construction
                                const allSpendItems: { id: string; name: string; cost: number; type: 'archived' | 'completed' | 'confirmed' | 'draft' }[] = [];

                                // Sort Trips by Updated (Most Recently Modified First)
                                const sortedTrips = [...trips].sort((a, b) => {
                                    const dateA = a.updated_at || a.created_at || 0;
                                    const dateB = b.updated_at || b.created_at || 0;
                                    return dateB - dateA;
                                });

                                sortedTrips.forEach(t => {
                                    // 1. Filter out Drafts
                                    if (t.status === 'draft') return;

                                    // 2. Add Current Item (Active/Recent) - FIRST
                                    const costStr = t.total_cost || t.data?.totalEstimatedCost || '';
                                    const match = costStr.match(/[\d,]+/);
                                    if (match) {
                                        allSpendItems.push({
                                            id: `${t.id}-curr`,
                                            name: t.destination?.split(':')[0] || t.destination,
                                            cost: parseFloat(match[0].replace(/,/g, '')),
                                            type: t.status // 'confirmed', 'completed'
                                        });
                                    }

                                    // 3. Add History Items (Archived) - SECOND
                                    // Reverse history to show newest archived runs first
                                    const history = t.data?.completionHistory;
                                    if (history && Array.isArray(history)) {
                                        [...history].reverse().forEach((hCost: string, idx: number) => {
                                            const match = hCost.match(/[\d,]+/);
                                            if (match) {
                                                allSpendItems.push({
                                                    id: `${t.id}-hist-${idx}`,
                                                    name: cleanDestination(t.destination) || t.destination,
                                                    cost: parseFloat(match[0].replace(/,/g, '')),
                                                    type: 'archived'
                                                });
                                            }
                                        });
                                    }
                                });

                                // Render
                                if (allSpendItems.length === 0) {
                                    return <div className="text-zinc-500 text-sm">No trips found.</div>;
                                }

                                return allSpendItems.map((item) => {
                                    // Dynamic Styles based on Status
                                    let borderColor = 'border-white/5';
                                    let bgColor = 'bg-zinc-900';
                                    let textColor = 'text-white';
                                    let costColor = 'text-zinc-400';
                                    let badgeColor = 'text-zinc-500 bg-white/5';
                                    let statusLabel = 'Draft';

                                    if (item.type === 'completed' || item.type === 'archived') {
                                        // Both History and Current Completed show as "Completed"
                                        borderColor = 'border-emerald-500/20';
                                        bgColor = 'bg-emerald-500/5';
                                        costColor = 'text-emerald-400';
                                        badgeColor = 'text-emerald-400 bg-emerald-400/10';
                                        statusLabel = 'Completed';
                                    } else if (item.type === 'confirmed') {
                                        borderColor = 'border-cyan-500/20';
                                        bgColor = 'bg-cyan-500/5';
                                        textColor = 'text-white';
                                        costColor = 'text-cyan-400';
                                        badgeColor = 'text-cyan-400 bg-cyan-400/10';
                                        statusLabel = 'Confirmed';
                                    }

                                    return (
                                        <div key={item.id} className={`flex justify-between items-center p-4 border rounded ${bgColor} ${borderColor} opacity-90`}>
                                            <div>
                                                <div className={`font-bold ${textColor}`}>{item.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold ${costColor}`}>₹{item.cost.toLocaleString()}</div>
                                                <div className={`text-xs px-2 py-0.5 inline-block rounded-sm uppercase tracking-wider ${badgeColor}`}>
                                                    {statusLabel}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Voyager Points Modal */}
            {showVoyagerPoints && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-24"
                    onClick={() => setShowVoyagerPoints(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div
                        className="relative bg-black border border-white/20 p-8 max-w-lg w-full max-h-[70vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowVoyagerPoints(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-3">
                            <Crown className="w-6 h-6 text-orange-400" /> Voyager Points
                        </h2>
                        <p className="text-zinc-500 text-sm mb-6">Your loyalty rewards summary</p>

                        <div className="text-5xl font-bold text-orange-400 mb-2">
                            {((stats?.totalCompletions || 0) * 150).toLocaleString()}
                        </div>
                        <p className="text-xs text-zinc-500 mb-8">Total points earned (150 per completed trip)</p>

                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">How Points Work</h3>
                        <div className="space-y-4 text-sm text-zinc-400">
                            <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-white/5">
                                <Award className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-white font-bold mb-1">Earn Points</div>
                                    <p>Get 150 points for every completed trip.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-white/5">
                                <Star className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-white font-bold mb-1">Member Benefits</div>
                                    <p>Unlock exclusive perks at Bronze (500), Silver (2000), Gold (5000), and Platinum (10000) tiers.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-white/5">
                                <Zap className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-white font-bold mb-1">Redeem Rewards</div>
                                    <p>Use points for priority booking, exclusive experiences, and partner discounts.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-500">Your Tier</span>
                                <span className={`text-sm font-bold px-3 py-1 ${(stats?.totalCompletions || 0) * 150 >= 10000 ? 'text-orange-400 bg-orange-400/10' :
                                    (stats?.totalCompletions || 0) * 150 >= 5000 ? 'text-yellow-400 bg-yellow-400/10' :
                                        (stats?.totalCompletions || 0) * 150 >= 2000 ? 'text-zinc-300 bg-zinc-300/10' :
                                            'text-orange-700 bg-orange-700/10'
                                    }`}>
                                    {(stats?.totalCompletions || 0) * 150 >= 10000 ? 'PLATINUM' :
                                        (stats?.totalCompletions || 0) * 150 >= 5000 ? 'GOLD' :
                                            (stats?.totalCompletions || 0) * 150 >= 2000 ? 'SILVER' : 'BRONZE'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Carbon Offset Modal */}
            {showCarbonOffset && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-24"
                    onClick={() => setShowCarbonOffset(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div
                        className="relative bg-black border border-white/20 p-8 max-w-lg w-full max-h-[70vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowCarbonOffset(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-3">
                            <Leaf className="w-6 h-6 text-emerald-400" /> Carbon Offset
                        </h2>
                        <p className="text-zinc-500 text-sm mb-6">Your environmental impact</p>

                        <div className="text-5xl font-bold text-emerald-400 mb-2">
                            {((stats?.totalCompletions || 0) * 0.5).toFixed(1)}t
                        </div>
                        <p className="text-xs text-zinc-500 mb-8">CO₂ offset through your travels (0.5t per completed trip)</p>

                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Sustainability Impact</h3>
                        <div className="space-y-4 text-sm text-zinc-400">
                            <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-white/5">
                                <Globe className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-white font-bold mb-1">Carbon Neutral Travel</div>
                                    <p>Every trip automatically contributes to verified carbon offset projects.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-white/5">
                                <Leaf className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-white font-bold mb-1">Tree Planting</div>
                                    <p>Equivalent to {Math.round((stats?.totalCompletions || 0) * 8)} trees planted through reforestation initiatives.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-white/5">
                                <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-white font-bold mb-1">Clean Energy</div>
                                    <p>Supporting renewable energy projects worldwide.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-500">Status</span>
                                <span className="text-sm font-bold text-emerald-400 px-3 py-1 bg-emerald-400/10">CARBON NEUTRAL</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cities Unlocked Modal */}
            {showCitiesUnlocked && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-24"
                    onClick={() => setShowCitiesUnlocked(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div
                        className="relative bg-black border border-white/20 p-8 max-w-lg w-full max-h-[70vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowCitiesUnlocked(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-3">
                            <MapPin className="w-6 h-6 text-white" /> Cities Unlocked
                        </h2>
                        <p className="text-zinc-500 text-sm mb-6">Your travel footprint</p>

                        <div className="text-5xl font-bold text-white mb-2">
                            {stats?.citiesVisited || 0}
                        </div>
                        <p className="text-xs text-zinc-500 mb-8">Unique destinations explored</p>

                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Destinations</h3>
                        <div className="space-y-2">
                            {(() => {
                                // Get unique cities from COMPLETED trips only (normalized to city name only)
                                const cities = new Map<string, { count: number, fullName: string }>();
                                trips
                                    .filter(t => t.status === 'completed')
                                    .forEach(t => {
                                        const fullCity = t.destination?.trim();
                                        if (fullCity) {
                                            // Normalize: extract just the city name (first part before comma)
                                            const normalizedCity = fullCity.toLowerCase().split(',')[0].trim();
                                            const existing = cities.get(normalizedCity);
                                            if (existing) {
                                                existing.count++;
                                            } else {
                                                // Store the first occurrence's full name for display
                                                cities.set(normalizedCity, { count: 1, fullName: fullCity.split(',')[0].trim() });
                                            }
                                        }
                                    });

                                if (cities.size === 0) {
                                    return (
                                        <div className="text-zinc-500 text-sm p-4 text-center border border-white/5 bg-zinc-900/30">
                                            No cities visited yet. Start planning your first trip!
                                        </div>
                                    );
                                }

                                return Array.from(cities.entries()).map(([cityKey, data]) => (
                                    <div
                                        key={cityKey}
                                        className="flex justify-between items-center p-4 border border-emerald-500/20 bg-emerald-500/5 relative group transition-colors hover:bg-emerald-500/10"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-4 h-4 text-emerald-400" />
                                            <span className="text-white font-bold">{data.fullName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {data.count > 1 && (
                                                <span className="text-xs text-zinc-500 hidden sm:inline-block">×{data.count}</span>
                                            )}
                                            <button
                                                onClick={() => handleShareClick({ name: data.fullName, count: data.count })}
                                                disabled={isSharing}
                                                className="px-2 py-1 flex items-center gap-1.5 border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 transition-all text-[10px] uppercase font-bold tracking-wider rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="View & Share Stamp"
                                            >
                                                {isSharing && sharingCity?.name === data.fullName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                                                <span className="hidden sm:inline">Share</span>
                                            </button>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {showTravelDNA && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-24"
                    onClick={() => setShowTravelDNA(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div
                        className="relative bg-black border border-white/20 p-8 max-w-lg w-full max-h-[70vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowTravelDNA(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-3">
                            <Fingerprint className="w-6 h-6 text-cyan-400" /> Travel DNA
                        </h2>

                        {(() => {
                            const persona = getPersona(stats?.dna);
                            const chartData = [
                                { label: 'Adventure', value: stats?.dna?.Adventure || 0 },
                                { label: 'Luxury', value: stats?.dna?.Luxury || 0 },
                                { label: 'Culture', value: stats?.dna?.Culture || 0 },
                                { label: 'Relaxation', value: stats?.dna?.Relaxation || 0 },
                            ];

                            return (
                                <div>
                                    <div className="mb-6 text-center border-b border-white/10 pb-6">
                                        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Archetype Analysis</div>
                                        <div className="text-3xl font-bold text-cyan-400 uppercase tracking-tight glow-text">{persona.title}</div>
                                        <div className="text-sm text-zinc-400 mt-2 italic">"{persona.desc}"</div>
                                    </div>

                                    <div className="flex justify-center mb-6">
                                        <RadarChart data={chartData} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {chartData.map(d => (
                                            <div key={d.label} className="bg-white/5 border border-white/10 p-3 text-center">
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{d.label}</div>
                                                <div className="text-xl font-bold text-white">{d.value}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Integrations Modal */}
            {showIntegrations && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-24"
                    onClick={() => setShowIntegrations(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div
                        className="relative bg-black border border-white/20 p-8 max-w-2xl w-full max-h-[70vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowIntegrations(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 transition-colors z-50"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-3">
                                <Link className="w-6 h-6 text-white" /> System Integrations
                            </h2>
                            <p className="text-zinc-500 text-sm">Manage your external data connections.</p>
                        </div>

                        <React.Suspense fallback={<div className="flex items-center justify-center p-12 text-zinc-500"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
                            <Integrations />
                        </React.Suspense>
                    </div>
                </div>
            )}

            {/* Generating Toast - Bottom Right with Smooth Animation */}
            {generatingToast && (
                <div
                    className="fixed bottom-6 right-6 z-[9999] transition-all duration-500 ease-out"
                    style={{
                        opacity: toastVisible ? 1 : 0,
                        transform: toastVisible ? 'translateX(0)' : 'translateX(100px)'
                    }}
                >
                    <div className="bg-black border border-yellow-500/40 p-5 shadow-2xl flex items-center gap-4 max-w-md backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-10 h-10 border-2 border-yellow-500/30 rounded-full flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="text-white font-bold text-sm uppercase tracking-wider">Generating Trip</div>
                            <div className="text-yellow-400 text-xs font-mono mt-1">{generatingToast.destination}</div>
                            <div className="text-zinc-500 text-xs mt-1">Check Prompt Log for status</div>
                        </div>
                        <button
                            onClick={() => {
                                setToastVisible(false);
                                setTimeout(() => setGeneratingToast(null), 400);
                            }}
                            className="text-zinc-500 hover:text-white transition-colors p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* OLD Success Toast Removed - Duplicate */}

            {/* Error Toast - Bottom Right with Smooth Animation */}
            {errorToast && (
                <div
                    className="fixed bottom-6 right-6 z-[9999] transition-all duration-500 ease-out"
                    style={{
                        opacity: errorToastVisible ? 1 : 0,
                        transform: errorToastVisible ? 'translateX(0)' : 'translateX(100px)'
                    }}
                >
                    <div className="bg-black border border-red-500/40 p-5 shadow-2xl flex items-center gap-4 max-w-md backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-10 h-10 border-2 border-red-500/30 rounded-full flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-red-400" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="text-white font-bold text-sm uppercase tracking-wider">Generation Failed</div>
                            <div className="text-red-400 text-xs font-mono mt-1">{errorToast.destination}</div>
                            <div className="text-zinc-500 text-xs mt-1">{errorToast.message}</div>
                        </div>
                        <button
                            onClick={() => {
                                setErrorToastVisible(false);
                                setTimeout(() => setErrorToast(null), 400);
                            }}
                            className="text-zinc-500 hover:text-white transition-colors p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInFromLeft {
                    from { opacity: 0; transform: translateX(-80px) scale(0.95); filter: blur(4px); }
                    to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
                }
                @keyframes slideInFromRight {
                    from { opacity: 0; transform: translateX(80px) scale(0.95); filter: blur(4px); }
                    to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
                }
                @keyframes slideInFromBottom {
                    from { opacity: 0; transform: translateY(60px) scale(0.95); filter: blur(4px); }
                    to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.8); filter: blur(8px); }
                    to { opacity: 1; transform: scale(1); filter: blur(0); }
                }
                @keyframes glowPulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(34, 211, 238, 0.6); }
                }
                /* Animations start paused, waiting for .animate-in trigger */
                .scroll-animate {
                    opacity: 0;
                }
                .animate-in .scroll-animate {
                    animation-play-state: running;
                }
                .animate-in .slide-left { animation: slideInFromLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-in .slide-right { animation: slideInFromRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-in .slide-bottom { animation: slideInFromBottom 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-in .scale-in { animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-in .delay-100 { animation-delay: 0.1s; }
                .animate-in .delay-200 { animation-delay: 0.2s; }
                .animate-in .delay-300 { animation-delay: 0.3s; }
                .animate-in .delay-400 { animation-delay: 0.4s; }
                .animate-in .delay-500 { animation-delay: 0.5s; }
                .animate-in .delay-600 { animation-delay: 0.6s; }
                /* Fallback for items not in view */
                .animate-out .scroll-animate { opacity: 0; transform: translateY(40px); }
                /* Glow effect for map section */
                .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
                .will-change-scroll { will-change: scroll-position; }
                .snap-start { transform: translateZ(0); backface-visibility: hidden; }
            `}</style>
            <div
                className="h-screen overflow-y-auto snap-y snap-mandatory pt-32 pb-20 bg-transparent relative will-change-scroll"
                style={{ animation: 'fadeIn 0.3s ease-out forwards', scrollbarGutter: 'stable' }}
            >
                {/* MODERN BACKGROUND - Scenic Image */}
                <div className="fixed inset-0 z-0 pointer-events-none bg-zinc-950">
                    <img
                        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2546&auto=format&fit=crop"
                        alt="Background"
                        className="w-full h-full object-cover opacity-60 animate-in fade-in duration-1000"
                        loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
                </div>

                {/* HEADER - Moved to Section 1 for Snap Layout */}
                <div className="relative z-10">
                    {/* Legacy Header Removed */}
                </div>

                {/* BOTTOM NAVIGATION - Split Glass Dock */}
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                    <nav className="relative flex items-center gap-2 px-2 py-2 rounded-full bg-white/10 backdrop-blur-3xl border border-white/20 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]">

                        {/* Sliding Active Pill (Only for Tabs) */}
                        <div
                            className="absolute bg-white/20 rounded-full h-10 w-10 transition-all duration-500 cubic-bezier(0.2, 0, 0, 1) shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md"
                            style={{
                                left: activeTab === 'overview' ? '8px' :
                                    activeTab === 'prompts' ? '56px' :
                                        activeTab === 'settings' ? '104px' :
                                            '-100px', // Hide if not in these tabs
                                opacity: (activeTab === 'overview' || activeTab === 'prompts' || activeTab === 'settings') ? 1 : 0
                            }}
                        />

                        {/* --- TAB GROUP --- */}

                        {/* Overview */}
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-300 relative z-10 ${activeTab === 'overview' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>

                        {/* Prompt Log */}
                        <button
                            onClick={() => setActiveTab('prompts')}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-300 relative z-10 ${activeTab === 'prompts' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        >
                            <Terminal className="w-5 h-5" />
                        </button>

                        {/* Settings */}
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-300 relative z-10 ${activeTab === 'settings' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        >
                            <Settings className="w-5 h-5" />
                        </button>

                        {/* --- DIVIDER --- */}
                        <div className="w-[1px] h-6 bg-white/10 mx-1" />

                        {/* --- ACTION GROUP --- */}

                        {/* Mission Join Input */}
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-3 py-1 ml-1 group-hover:border-cyan-400/30 transition-all">
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="JOIN"
                                className="w-16 md:w-20 bg-transparent border-none text-[10px] font-mono text-white tracking-widest focus:ring-0 outline-none placeholder:text-zinc-600"
                            />
                            <button
                                onClick={async () => {
                                    if (joinCode.length >= 4) {
                                        setIsJoining(true);
                                        await onJoinMission(joinCode);
                                        setIsJoining(false);
                                        setJoinCode('');
                                    }
                                }}
                                disabled={joinCode.length < 4 || isJoining}
                                className="text-cyan-400 disabled:opacity-30 hover:scale-110 transition-transform"
                            >
                                {isJoining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            </button>
                        </div>

                        {/* New Trip */}
                        <button
                            onClick={() => onLoadTrip(null)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-white text-black shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:shadow-[0_0_40px_rgba(34,211,238,0.8)] transition-all duration-300 hover:scale-105 relative z-10 border border-white/50"
                        >
                            <Plus className="w-5 h-5" strokeWidth={3} />
                        </button>
                    </nav>
                </div >


                {/* TAB CONTENT - SEPARATE WIDTH CONSTRAINT */}
                <div className="px-4 md:px-6 max-w-5xl mx-auto mt-8 pb-32">
                    {activeTab === 'overview' && (
                        <div className="flex flex-col w-full">
                            <section className="min-h-screen w-full snap-start flex flex-col justify-center pt-24 pb-12">
                                {/* HERO GRID: Active Mission + Upcoming Queue */}
                                <div className="relative mb-6 flex flex-col gap-6">
                                    {/* MAIN: Active Mission (Timer) */}
                                    <div className="w-full">
                                        <MissionControlHeader
                                            activeMission={activeMission as StoredTrip | null}
                                            onComplete={handleCompleteMission}
                                            onFreeze={handleFreezeMission}
                                            onResume={handleResumeMission}
                                            onCancel={handleCancelRequest}
                                            onLeave={handleLeaveMission}
                                            onViewItinerary={onLoadTrip}
                                            onSync={handleCardSync}
                                            syncProgress={syncProgress}
                                            syncingIds={syncingIds}
                                            isLoading={!stats || !hydrated}
                                            isGuest={!!(activeMission && user && activeMission.user_id !== user.id)}
                                            isAdmin={isActiveAdmin}
                                        />
                                    </div>

                                    {/* SIDE: Upcoming Missions Queue (Redesigned: Hover Dropdown) */}
                                    {/* SIDE: Upcoming Missions Queue (Redesigned: Hover Dropdown) */}
                                    <div className="w-full lg:w-auto lg:absolute lg:top-0 lg:right-0 z-[100] flex justify-center lg:justify-end mt-0 lg:mt-0">
                                        <div className="relative group/upcoming w-full md:w-60">
                                            {/* COMPACT TRIGGER CARD */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUpcomingOpen(!upcomingOpen);
                                                }}
                                                className={`bg-black/40 backdrop-blur-xl border ${upcomingOpen ? 'border-cyan-500/50 bg-white/10' : 'border-white/10'} md:group-hover/upcoming:border-cyan-500/50 md:group-hover/upcoming:bg-white/10 rounded-2xl p-4 w-full h-auto flex flex-col justify-center gap-3 cursor-pointer hover:bg-white/5 transition-all shadow-2xl relative z-[101]`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 bg-white/5 border border-white/10 text-cyan-400">
                                                            <Calendar className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold">Upcoming</h3>
                                                            <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
                                                                {Math.max(0, ongoingTripsSorted.length - 1)} Queued
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-all duration-500 ${upcomingOpen ? 'text-cyan-400 rotate-180' : ''} md:group-hover/upcoming:text-cyan-400 md:group-hover/upcoming:rotate-180`} />
                                                </div>
                                            </div>

                                            {/* DROPDOWN MENU - Mobile: state-based, Desktop: hover-based */}
                                            <div className={`absolute top-[calc(100%+8px)] left-0 w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out z-[200] max-h-48 overflow-y-auto custom-scrollbar ${upcomingOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 md:group-hover/upcoming:opacity-100 md:group-hover/upcoming:visible md:group-hover/upcoming:translate-y-0'}`}>
                                                {ongoingTripsSorted.length <= 1 ? (
                                                    <div className="p-4 text-center text-zinc-500 text-[10px] uppercase tracking-wider font-mono">
                                                        No missions queued
                                                    </div>
                                                ) : (
                                                    ongoingTripsSorted.slice(1).map((trip: any) => (
                                                        <div
                                                            key={trip.id}
                                                            onClick={() => onLoadTrip(trip)}
                                                            className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group/card relative pr-8 mb-2 last:mb-0"
                                                        >
                                                            {/* Remove Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Delete trip (removes from active queue) - Immediate Action
                                                                    if (user?.id) {
                                                                        // 1. Optimistic State Update (Immediate)
                                                                        setTrips(prev => prev.filter(t => t.id !== trip.id));

                                                                        // 2. Synchronize LocalStorage (Prevent re-hydration)
                                                                        try {
                                                                            const cached = getLocal('voyageur_trips_v1', []);
                                                                            const filtered = cached.filter((t: any) => t.id !== trip.id);
                                                                            setLocal('voyageur_trips_v1', filtered);
                                                                        } catch (err) {
                                                                            console.error("Failed to sync localStorage after removing trip:", err);
                                                                        }

                                                                        const isOwner = trip.user_id === user.id;
                                                                        const removalPromise = isOwner
                                                                            ? dbService.deleteTrip(user.id, trip.id)
                                                                            : dbService.leaveSquad(user.id, trip.id);

                                                                        removalPromise.then(() => {
                                                                            setStats((prev: any) => ({
                                                                                ...prev,
                                                                                recentTrips: prev.recentTrips.filter((t: any) => t.id !== trip.id)
                                                                            }));
                                                                            showToast(isOwner ? "Trip removed." : "Mission abandoned.", 'info');
                                                                        });
                                                                    }
                                                                }}
                                                                className="absolute top-3 right-3 p-1 text-zinc-600 hover:text-red-500 hover:bg-white/10 rounded-full transition-colors z-20"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>

                                                            <div className="flex justify-between items-start">
                                                                <h4 className="text-xs font-bold text-white group-hover/card:text-cyan-400 transition-colors line-clamp-1">
                                                                    <ScrambleText text={cleanDestination(trip.destination)} speed={50} />
                                                                </h4>
                                                                {trip.status === 'paused' && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] shrink-0 ml-2" />
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono uppercase tracking-wider">
                                                                <span>{trip.duration || 'Flexible'}</span>
                                                                {trip.startDate && (
                                                                    <span>{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <AnimatedSection className="w-full max-w-5xl mx-auto px-4 md:px-6 mb-12">
                                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4 items-start">
                                        {/* Spend Card */}
                                        <div
                                            onClick={() => setShowSpendBreakdown(true)}
                                            className="md:col-span-2 lg:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 p-3 relative overflow-hidden group hover:bg-white/10 hover:border-emerald-400/30 transition-colors cursor-pointer h-[140px] flex flex-col justify-between rounded-xl shadow-lg hover:shadow-emerald-900/20 scroll-animate slide-bottom"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="p-1.5 bg-white/5 border border-white/10 text-white rounded"><CreditCard className="w-3.5 h-3.5" /></div>
                                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 uppercase tracking-wider rounded">Ledger</span>
                                            </div>
                                            <div className="h-[32px] flex items-end">
                                                <div className="text-2xl font-bold text-white mb-0.5 tracking-tight tabular-nums">
                                                    {!stats ? <Skeleton className="h-6 w-24" /> : `₹${(stats.totalSpend || 0).toLocaleString()}`}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Lifetime Spend</div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setShowVoyagerPoints(true)}
                                            className="md:col-span-2 lg:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 p-3 relative overflow-hidden group hover:bg-white/10 hover:border-orange-400/30 transition-colors cursor-pointer h-[140px] flex flex-col justify-between rounded-xl shadow-lg hover:shadow-orange-900/20 scroll-animate slide-bottom delay-100"
                                        >
                                            <div className="flex justify-between items-start mb-1 relative z-10">
                                                <div className="p-1.5 bg-white/5 border border-white/10 text-white rounded"><Crown className="w-3.5 h-3.5" /></div>
                                                <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 uppercase tracking-wider rounded">Member</span>
                                            </div>
                                            <div className="h-[32px] flex items-end">
                                                <div className="text-2xl font-bold text-white mb-0.5 tracking-tight tabular-nums">
                                                    {!stats ? <Skeleton className="h-6 w-16" /> : <ScrambleText text={String((stats.totalCompletions || 0) * 150)} speed={40} />}
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold relative z-10">Voyager Points</div>
                                        </div>

                                        {/* Carbon Card */}
                                        <div
                                            onClick={() => setShowCarbonOffset(true)}
                                            className="md:col-span-2 lg:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 p-3 relative overflow-hidden group hover:bg-white/10 hover:border-cyan-400/30 transition-colors cursor-pointer h-[140px] flex flex-col justify-between rounded-xl shadow-lg hover:shadow-cyan-900/20 scroll-animate slide-bottom delay-200"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="p-1.5 bg-white/5 border border-white/10 text-white rounded"><Leaf className="w-3.5 h-3.5" /></div>
                                                <span className="text-[9px] font-bold text-zinc-400 bg-white/5 px-1.5 py-0.5 border border-white/10 rounded">Neutral</span>
                                            </div>
                                            <div className="h-[32px] flex items-end">
                                                <div className="text-2xl font-bold text-white mb-0.5 tracking-tight tabular-nums">
                                                    {!stats ? <Skeleton className="h-6 w-24" /> : <ScrambleText text={`${(stats.totalCompletions || 0) * 0.5}t`} speed={30} />}
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Carbon Offset</div>
                                        </div>

                                        {/* Cities Unlocked */}
                                        <div
                                            onClick={() => setShowCitiesUnlocked(true)}
                                            className="md:col-span-2 lg:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 p-3 relative overflow-hidden group hover:bg-white/10 hover:border-white/30 transition-colors cursor-pointer h-[140px] flex flex-col justify-between rounded-xl shadow-lg scroll-animate slide-bottom delay-300"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="p-1.5 bg-white/5 border border-white/10 text-white rounded"><MapPin className="w-3.5 h-3.5" /></div>
                                                <span className="text-[9px] font-bold text-white bg-white/10 border border-white/20 px-1.5 py-0.5 uppercase tracking-wider">Explore</span>
                                            </div>
                                            <div className="h-[32px] flex items-end">
                                                <div className="text-2xl font-bold text-white mb-0.5 tracking-tight tabular-nums">
                                                    {!hydrated ? <Skeleton className="h-6 w-12" /> : <ScrambleText text={String(stats?.citiesVisited || 0)} speed={40} />}
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Cities Unlocked</div>
                                        </div>
                                    </div>
                                </AnimatedSection>
                            </section>

                            {/* SECTION 2: FEATURED EXPEDITIONS */}
                            <section className="min-h-screen w-full snap-start flex flex-col justify-center pt-24 pb-12">
                                <AnimatedSection className="w-full">
                                    {/* FEATURED EXPEDITIONS */}
                                    <FeaturedExpeditions onSelectTrip={onLoadTrip} />
                                </AnimatedSection>
                            </section>

                            {/* SECTION 3: GLOBAL INTEL */}
                            <section className="min-h-screen w-full snap-start flex flex-col justify-center pt-24 pb-12">
                                <AnimatedSection className="w-full">

                                    {/* MISSION MAP - ENCAPSULATED WITH ENTRANCE ANIMATIONS */}
                                    <React.Suspense fallback={<div className="h-[400px] flex items-center justify-center border border-white/10 rounded-xl bg-white/5"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>}>
                                        <MissionMap trips={completedTrips} hydrated={hydrated} />
                                    </React.Suspense>

                                </AnimatedSection>
                            </section>

                            {/* SECTION 4: SYSTEM CORE */}
                            <section className="min-h-screen w-full snap-start flex flex-col justify-center pt-32 pb-32">
                                <div className="mb-10 pl-1">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tighter drop-shadow-xl">
                                        Neural <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Core</span>
                                    </h2>
                                </div>
                                <AnimatedSection className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-8 items-start">

                                    {/* SYSTEM ROW: DNA | INTEGRATIONS | COMMUNITY (3 Equal Columns) */}

                                    {/* 1. TRAVEL DNA */}
                                    <div
                                        onClick={() => setShowTravelDNA(true)}
                                        className="md:col-span-2 lg:col-span-4 glass-panel p-6 rounded-2xl relative overflow-hidden border border-white/10 group cursor-pointer bg-black/40 backdrop-blur-xl transition-colors hover:border-white/20 hover:shadow-2xl h-[350px] flex flex-col justify-between scroll-animate slide-left"
                                    >
                                        {/* Corner Accents */}
                                        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/30 rounded-tl-lg"></div>
                                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/30 rounded-br-lg"></div>

                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="font-mono text-[10px] text-gray-400 tracking-[0.2em] uppercase">Travel DNA Sequence</h4>
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                                                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                                                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>

                                        {/* Dominant Trait (Creative Filler) */}
                                        <div className="mb-6 relative">
                                            <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full opacity-20 animate-pulse"></div>
                                            <div className="relative border border-white/10 bg-white/5 rounded-lg p-3 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1">Dominant Trait</div>
                                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                                                        {(Object.entries(stats?.dna || {}).reduce((a, b) => ((b[1] as number) > (a[1] as number) ? b : a), ['Relaxation', 0] as [string, number])[0] as string) || 'Uncalibrated'}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1">Match Index</div>
                                                    <div className="text-sm font-bold text-cyan-400">
                                                        {(Object.values(stats?.dna || {}).reduce((a: number, b: number) => Math.max(a, b), 0) as number)}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* DNA Progress Bars */}
                                        <div className="space-y-5">
                                            {/* Relax (Teal) */}
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-mono text-gray-500 w-16 text-right uppercase tracking-wider">Relax</span>
                                                <div className="flex-1 h-8 bg-black/40 rounded-md relative overflow-hidden border border-white/5">
                                                    <div
                                                        className="absolute inset-0 bg-teal-500/20 border-r-2 border-teal-500 flex items-center justify-end pr-2 transition-all duration-1000 ease-out group-hover:bg-teal-500/30"
                                                        style={{ width: `${stats?.dna?.Relaxation || 0}%` }}
                                                    >
                                                        <span className="text-[9px] text-teal-400 font-mono font-bold">{stats?.dna?.Relaxation || 0}%</span>
                                                    </div>
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,rgba(0,0,0,0.8)_3px)] bg-[length:4px_100%] opacity-30"></div>
                                                </div>
                                            </div>

                                            {/* Culture (Purple) */}
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-mono text-gray-500 w-16 text-right uppercase tracking-wider">Culture</span>
                                                <div className="flex-1 h-8 bg-black/40 rounded-md relative overflow-hidden border border-white/5">
                                                    <div
                                                        className="absolute inset-0 bg-purple-500/20 border-r-2 border-purple-500 flex items-center justify-end pr-2 transition-all duration-1000 ease-out delay-100 group-hover:bg-purple-500/30"
                                                        style={{ width: `${stats?.dna?.Culture || 0}%` }}
                                                    >
                                                        <span className="text-[9px] text-purple-400 font-mono font-bold">{stats?.dna?.Culture || 0}%</span>
                                                    </div>
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,rgba(0,0,0,0.8)_3px)] bg-[length:4px_100%] opacity-30"></div>
                                                </div>
                                            </div>

                                            {/* Adventure (Orange) */}
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-mono text-gray-500 w-16 text-right uppercase tracking-wider">Adventure</span>
                                                <div className="flex-1 h-8 bg-black/40 rounded-md relative overflow-hidden border border-white/5">
                                                    <div
                                                        className="absolute inset-0 bg-orange-500/20 border-r-2 border-orange-500 flex items-center justify-end pr-2 transition-all duration-1000 ease-out delay-200 group-hover:bg-orange-500/30"
                                                        style={{ width: `${stats?.dna?.Adventure || 0}%` }}
                                                    >
                                                        <span className="text-[9px] text-orange-400 font-mono font-bold">{stats?.dna?.Adventure || 0}%</span>
                                                    </div>
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,rgba(0,0,0,0.8)_3px)] bg-[length:4px_100%] opacity-30"></div>
                                                </div>
                                            </div>

                                            {/* Luxury (Yellow) - Added to fill space */}
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-mono text-gray-500 w-16 text-right uppercase tracking-wider">Luxury</span>
                                                <div className="flex-1 h-8 bg-black/40 rounded-md relative overflow-hidden border border-white/5">
                                                    <div
                                                        className="absolute inset-0 bg-yellow-500/20 border-r-2 border-yellow-500 flex items-center justify-end pr-2 transition-all duration-1000 ease-out delay-300 group-hover:bg-yellow-500/30"
                                                        style={{ width: `${stats?.dna?.Luxury || 0}%` }}
                                                    >
                                                        <span className="text-[9px] text-yellow-500 font-mono font-bold">{stats?.dna?.Luxury || 0}%</span>
                                                    </div>
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,rgba(0,0,0,0.8)_3px)] bg-[length:4px_100%] opacity-30"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. INTEGRATIONS */}
                                    <div
                                        onClick={() => setShowIntegrations(true)}
                                        className="md:col-span-2 lg:col-span-4 bg-black/50 backdrop-blur-md p-6 border border-white/10 flex flex-col justify-between cursor-pointer hover:border-white/30 h-[350px] group rounded-xl scroll-animate slide-bottom delay-100"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <h3 className="text-xs font-bold text-white uppercase tracking-widest">System Links</h3>
                                                <Link className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="space-y-4">
                                                {/* Google Calendar */}
                                                <div className={`p-4 border rounded-lg transition-all duration-300 ${isGCalConnected
                                                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                    : 'border-white/5 bg-white/5 hover:bg-white/10'
                                                    }`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${isGCalConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'}`} />
                                                            <span className={`text-sm font-bold ${isGCalConnected ? 'text-white' : 'text-zinc-400'}`}>Google Calendar</span>
                                                        </div>
                                                        {isGCalConnected && <div className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono">LINKED</div>}
                                                    </div>
                                                </div>

                                                {/* Gmail */}
                                                <div className={`p-4 border rounded-lg transition-all duration-300 ${isGmailConnected
                                                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                    : 'border-white/5 bg-white/5 hover:bg-white/10 opacity-70'
                                                    }`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${isGmailConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'}`} />
                                                            <span className={`text-sm font-bold ${isGmailConnected ? 'text-white' : 'text-zinc-400'}`}>Gmail</span>
                                                        </div>
                                                        {isGmailConnected && <div className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono">LINKED</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-zinc-600 font-mono uppercase text-right mt-2">
                                            {isGCalConnected ? 'Systems Nominal' : 'Action Required'}
                                        </div>
                                    </div>

                                    {/* 3. COMMUNITY */}
                                    <div
                                        onClick={() => setView(AppView.COMMUNITY)}
                                        className="md:col-span-2 lg:col-span-4 bg-black/50 backdrop-blur-md p-6 border border-white/10 flex flex-col justify-between cursor-pointer hover:border-white/30 h-[350px] group rounded-xl scroll-animate slide-right delay-200"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Global Feed</h3>
                                                <Users className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                            </div>

                                            <div className="aspect-video w-full bg-white/5 rounded border border-white/5 mb-4 flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                                <img
                                                    src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=600"
                                                    alt="Community"
                                                    className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                                />
                                                <div className="absolute bottom-3 left-3 z-20">
                                                    <div className="text-xs font-bold text-white">Top 10 Hidden Gems</div>
                                                    <div className="text-[10px] text-zinc-400">Curated by Voyageur</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono uppercase">
                                            <span>Active Users: 12.4k</span>
                                            <span className="flex items-center gap-1 text-cyan-400">Join <ArrowRight className="w-3 h-3" /></span>
                                        </div>
                                    </div>



                                    {/* HISTORY */}
                                    <div className="col-span-full">
                                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
                                            <History className="w-5 h-5 text-zinc-400" /> Recent Expeditions
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {completedTrips.filter((t: any) => t.status !== 'cancelled').length > 0 ? completedTrips.filter((t: any) => t.status !== 'cancelled').map((trip: any, index: number) => (
                                                <div
                                                    key={trip?.id || `trip-${index}`}
                                                    onClick={() => onLoadTrip(trip)}
                                                    className="min-h-[120px] border border-white/10 p-4 md:p-6 flex flex-col justify-between hover:bg-white/5 transition-colors group cursor-pointer"
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                                        <h4 className="text-lg md:text-xl font-bold text-white uppercase group-hover:text-cyan-400 transition-colors">{cleanDestination(trip?.destination) || 'Unknown'}</h4>
                                                        <span className="text-xs text-zinc-500 font-mono shrink-0">{trip?.created_at ? new Date(trip.created_at).toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-end mt-3">
                                                        <span className="text-sm text-zinc-400 font-mono">{trip?.duration || 'N/A'}</span>
                                                        <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="min-h-[120px] border border-white/10 border-dashed flex items-center justify-center text-zinc-600 font-mono text-sm uppercase col-span-full">
                                                    No history found.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AnimatedSection>
                            </section>
                        </div>
                    )}

                    {
                        activeTab === 'prompts' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6">
                                <div className="md:col-span-4 lg:col-span-12 bg-black/50 backdrop-blur-md border border-white/10 overflow-hidden">
                                    <div className="p-4 md:p-8 border-b border-white/10 flex flex-col md:flex-row md:justify-between md:items-center gap-3 bg-white/[0.02]">
                                        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3 uppercase">
                                            <Terminal className="w-5 md:w-6 h-5 md:h-6 text-white" /> Interaction Logs
                                        </h2>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={exportToCSV}
                                                className="px-3 md:px-4 py-2 bg-black border border-white/20 text-xs font-bold text-zinc-400 hover:text-white hover:border-white transition-all uppercase tracking-wider"
                                            >Export CSV</button>
                                        </div>
                                    </div>
                                    {/* Unified List: Merge all prompts + trips, sorted by date */}
                                    {(() => {
                                        // ANTI-GLITCH Migration: Clear old unscoped keys once to ensure isolation
                                        if (typeof localStorage !== 'undefined' && !localStorage.getItem('voyageur_isolated_v1')) {
                                            localStorage.removeItem('voyageur_trips_v1');
                                            localStorage.removeItem('voyageur_prompts');
                                            localStorage.setItem('voyageur_isolated_v1', 'true');
                                        }

                                        // 1. Convert everything to common objects (hide cancelled/completed guest trips from logs)
                                        const tripItems = trips.filter(t => !((t.status === 'cancelled' || t.status === 'completed') && (t.is_joined || t.data?.is_joined))).map(t => ({ type: 'trip', ...t }));
                                        const rawPromptItems = prompts.filter(p => p.status !== 'consumed').map(p => ({ type: 'prompt', ...p }));

                                        // 2. Combine and Sort by most recent interaction
                                        const allItems = [...tripItems, ...rawPromptItems].sort((a, b) => b.created_at - a.created_at);

                                        // 3. Deduplicate by Mission ID (Trips use promptId, Prompts use id)
                                        // We keep the first one we find (which is the newest/most advanced)
                                        const deduped: any[] = [];
                                        const seenMissionIds = new Set();

                                        allItems.forEach(item => {
                                            const missionId = item.type === 'trip' ? (item.promptId || item.data?.promptId) : item.id;
                                            if (missionId && !seenMissionIds.has(missionId)) {
                                                deduped.push(item);
                                                seenMissionIds.add(missionId);
                                            } else if (!missionId) {
                                                // Should not happen with current logic, but fallback
                                                deduped.push(item);
                                            }
                                        });

                                        if (deduped.length === 0) {
                                            return (
                                                <div className="p-8 text-center text-zinc-600 font-mono uppercase">
                                                    No mission logs found.
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="max-h-[500px] overflow-y-auto">
                                                {deduped.map((item: any) => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => handlePromptClick(item)}
                                                        className={`p-4 md:p-6 border-b border-white/5 hover:bg-white/5 transition-colors duration-300 group ${(item.type === 'trip' || item.status === 'ready') ? 'cursor-pointer' : 'cursor-default'} ${convertingId === item.id ? 'opacity-70 cursor-wait' : ''}`}
                                                    >
                                                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                                                            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest truncate max-w-[200px] md:max-w-none">
                                                                {cleanDestination(item.destination || item.result?.destination || item.data?.destination) || item.prompt?.slice(0, 40)}
                                                            </span>
                                                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                                                {/* Status Badge with transitions */}
                                                                {item.type === 'prompt' && item.status === 'generating' && (
                                                                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 uppercase tracking-wider flex items-center gap-1">
                                                                        <Loader2 className="w-3 h-3 animate-spin" /> Generating
                                                                    </span>
                                                                )}
                                                                {item.status === 'ready' && item.type === 'prompt' && (
                                                                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1">
                                                                        {convertingId === item.id ? (
                                                                            <><Loader2 className="w-3 h-3 animate-spin" /> Creating...</>
                                                                        ) : (
                                                                            <><Check className="w-3 h-3" /> Ready</>
                                                                        )}
                                                                    </span>
                                                                )}
                                                                {item.status === 'failed' && (
                                                                    <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider transition-all duration-300">
                                                                        Failed
                                                                    </span>
                                                                )}
                                                                {(item.status === 'confirmed' || (item.type === 'trip' && item.status === 'confirmed')) && (
                                                                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider flex items-center gap-1">
                                                                        <Check className="w-3 h-3" /> Confirmed
                                                                    </span>
                                                                )}
                                                                {item.type === 'trip' && item.status === 'draft' && (
                                                                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                                                        <Zap className="w-3 h-3" /> Mission Draft
                                                                    </span>
                                                                )}
                                                                {item.status === 'cancelled' && (
                                                                    <span className="text-xs px-2 py-0.5 bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 uppercase tracking-wider flex items-center gap-1">
                                                                        <XCircle className="w-3 h-3" /> Cancelled
                                                                    </span>
                                                                )}
                                                                {item.status === 'completed' && (
                                                                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3" /> Completed
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-zinc-600 font-mono">{new Date(item.created_at).toLocaleString()}</span>
                                                            </div>
                                                        </div>

                                                        {/* Prompt/Summary Content - Unified logic */}
                                                        <div className="flex flex-col gap-2 mb-2">
                                                            <p className="text-zinc-300 font-mono text-xs md:text-sm leading-relaxed line-clamp-3 md:line-clamp-none">
                                                                <span className="text-zinc-600 mr-2">$</span>
                                                                {item.originalPrompt || item.data?.originalPrompt || item.prompt || `Mission to ${cleanDestination(item.destination)}`}
                                                            </p>

                                                            {/* Show output summary for drafts/confirmed/completed */}
                                                            {item.status !== 'ready' && item.status !== 'generating' && (item.data?.summary || item.result?.summary) && (
                                                                <div className="pl-4 border-l border-cyan-500/20 py-1">
                                                                    <p className="text-xs text-zinc-500 italic font-mono leading-relaxed">
                                                                        {item.data?.summary || item.result?.summary}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {item.type === 'trip' && (
                                                            <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
                                                                <span>{item.duration}</span>
                                                                <span>{item.total_cost}</span>
                                                            </div>
                                                        )}
                                                        {item.type === 'prompt' && item.status === 'failed' && item.error && (
                                                            <div className="mt-2 text-xs text-red-400 font-mono">Error: {item.error}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'settings' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Sidebar - 3 Focused Tabs */}
                                <div className="lg:col-span-4 space-y-3">
                                    {[
                                        { label: 'Account', id: 'account', icon: <User className="w-4 h-4" /> },
                                        { label: 'Travel Preferences', id: 'preferences', icon: <Star className="w-4 h-4" /> },
                                        { label: 'Credits', id: 'credits', icon: <CreditCard className="w-4 h-4" /> },
                                        { label: 'Google Calendar', id: 'calendar', icon: <Calendar className="w-4 h-4" /> }
                                    ].map(item => {
                                        const isActive = activeSettingsTab === item.id;
                                        console.log(`[Dashboard] Rendering Tab ID: ${item.id}, Active: ${isActive}`);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => setActiveSettingsTab(item.id)}
                                                className={`p-4 border font-bold flex items-center gap-3 uppercase tracking-wide text-sm cursor-pointer transition-all duration-200 ${isActive
                                                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-[1.02]'
                                                    : 'bg-black/30 backdrop-blur-md text-zinc-400 border-white/10 hover:text-white hover:border-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {item.icon}
                                                {item.label}
                                                <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${isActive ? 'rotate-90' : ''}`} />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Main Settings Area */}
                                <div className="lg:col-span-8 bg-black/50 backdrop-blur-md border border-white/10 p-8">
                                    {/* ACCOUNT TAB */}
                                    {activeSettingsTab === 'account' && (
                                        <>
                                            <div className="mb-10 pb-6 border-b border-white/10">
                                                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Account</h3>
                                                <p className="text-sm text-zinc-500 font-mono">Manage your profile and account settings.</p>
                                            </div>

                                            <div className="space-y-6">
                                                {/* Profile Info */}
                                                <div className="bg-white/5 border border-white/10 p-6">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Profile Information</h4>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                                                            <div className="flex-1">
                                                                <div className="text-xs text-zinc-500 uppercase tracking-wider">Name</div>
                                                                {editingName ? (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <input
                                                                            type="text"
                                                                            value={newName}
                                                                            onChange={(e) => setNewName(e.target.value)}
                                                                            className="bg-black border border-white/20 text-white font-mono px-3 py-2 text-sm outline-none focus:border-cyan-400 w-full max-w-[200px]"
                                                                            placeholder="Enter your name"
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            onClick={async () => {
                                                                                const userId = user?.id;
                                                                                if (userId && newName.trim()) {
                                                                                    const success = await dbService.updateUserName(user.id, newName.trim());
                                                                                    setEditingName(false);
                                                                                    if (success) {
                                                                                        showToast('Name updated successfully!', 'success');

                                                                                        // 1. Dispatch event for App.tsx to update global state
                                                                                        window.dispatchEvent(new CustomEvent('voyageur:user-update', {
                                                                                            detail: { fullName: newName.trim() }
                                                                                        }));

                                                                                        // 2. Update localStorage Cache IMMEDIATELY (prevents reload flicker)
                                                                                        localStorage.setItem(`voyageur_fullname_${user.id}`, newName.trim());
                                                                                    } else {
                                                                                        showToast('Failed to update name', 'error');
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="px-3 py-2 bg-cyan-500 text-black text-xs font-bold uppercase hover:bg-cyan-400 transition-colors"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setEditingName(false); setNewName(user?.fullName || ''); }}
                                                                            className="px-3 py-2 bg-white/10 text-white text-xs font-bold uppercase hover:bg-white/20 transition-colors"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-white font-mono">{newName || user?.fullName || 'Traveler'}</span>
                                                                        <button
                                                                            onClick={() => { setEditingName(true); setNewName(newName || user?.fullName || ''); }}
                                                                            className="text-xs text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                                                {(newName || user?.fullName)?.[0]?.toUpperCase() || 'T'}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                                                            <div>
                                                                <div className="text-xs text-zinc-500 uppercase tracking-wider">Email</div>
                                                                <div className="text-white font-mono mt-1">{user?.email || 'Not set'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between py-3">
                                                            <div>
                                                                <div className="text-xs text-zinc-500 uppercase tracking-wider">Member Since</div>
                                                                <div className="text-white font-mono mt-1">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Account Actions */}
                                                <div className="border-t border-white/10 pt-6">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Actions</h4>
                                                    <div className="space-y-3">
                                                        <button
                                                            onClick={() => setView(AppView.SUPPORT)}
                                                            className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <HelpCircle className="w-4 h-4" /> Get Help & Support
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('Are you sure you want to sign out?')) {
                                                                    onSignOut();
                                                                }
                                                            }}
                                                            className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <LogOut className="w-4 h-4" /> Sign Out
                                                        </button>
                                                    </div>
                                                </div>


                                            </div>
                                        </>
                                    )}

                                    {/* TRAVEL PREFERENCES TAB */}
                                    {activeSettingsTab === 'preferences' && (
                                        <>
                                            <div className="mb-10 pb-6 border-b border-white/10">
                                                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Travel Preferences</h3>
                                                <p className="text-sm text-zinc-500 font-mono">Customize how AI generates your trips.</p>
                                            </div>

                                            <div className="space-y-6">
                                                {/* Dietary Restrictions */}
                                                <div className="bg-white/5 border border-white/10 p-6">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Dietary Restrictions</h4>
                                                    <p className="text-xs text-zinc-500 mb-4">Filter restaurant recommendations based on your diet</p>
                                                    <select
                                                        value={settings.dietary}
                                                        onChange={(e) => updateSetting('dietary', e.target.value)}
                                                        className="w-full bg-black border border-white/20 text-white text-sm font-medium px-4 py-3 outline-none focus:border-cyan-400 transition-colors cursor-pointer appearance-none uppercase tracking-wider"
                                                    >
                                                        <option value="None">No Restrictions</option>
                                                        <option value="Vegetarian">Vegetarian</option>
                                                        <option value="Vegan">Vegan</option>
                                                        <option value="Gluten-Free">Gluten-Free</option>
                                                        <option value="Halal">Halal</option>
                                                        <option value="Kosher">Kosher</option>
                                                    </select>
                                                </div>

                                                {/* Luxury Tier */}
                                                <div className="bg-white/5 border border-white/10 p-6">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Luxury Tier</h4>
                                                    <p className="text-xs text-zinc-500 mb-4">Set your preferred hotel star rating</p>
                                                    <div className="flex items-center gap-2">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                onClick={() => updateSetting('luxury', star)}
                                                                className={`w-12 h-12 flex items-center justify-center border transition-all ${star <= settings.luxury ? 'bg-orange-500/20 border-orange-400 text-orange-400' : 'bg-white/5 border-white/10 text-zinc-600 hover:border-white/30'}`}
                                                            >
                                                                <Star className={`w-5 h-5 ${star <= settings.luxury ? 'fill-orange-400' : ''}`} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="mt-4 text-xs text-zinc-400">
                                                        {settings.luxury === 1 && 'Budget-friendly accommodations'}
                                                        {settings.luxury === 2 && 'Economy stays with basic amenities'}
                                                        {settings.luxury === 3 && 'Comfortable mid-range hotels'}
                                                        {settings.luxury === 4 && 'Premium hotels with great service'}
                                                        {settings.luxury === 5 && 'Luxury 5-star experiences'}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* CREDITS TAB */}
                                    {activeSettingsTab === 'credits' && (
                                        <>
                                            <div className="mb-10 pb-6 border-b border-white/10">
                                                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Credits</h3>
                                                <p className="text-sm text-zinc-500 font-mono">Manage your trip generation credits.</p>
                                            </div>

                                            <div className="space-y-6">
                                                {/* Current Balance */}
                                                <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 p-6">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <div className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Available Credits</div>
                                                            <div className="text-5xl font-bold text-white mt-2 font-mono">{user?.credits || 0}</div>
                                                        </div>
                                                        <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                                                            <Zap className="w-8 h-8 text-cyan-400" />
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-zinc-400 mb-6 flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                                                        1 Credit = 1 AI-Generated Trip Plan
                                                    </div>
                                                    <button
                                                        onClick={() => setView(AppView.PRICING)}
                                                        className="w-full py-4 bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-bold text-sm uppercase tracking-wider hover:brightness-110 hover:scale-[1.01] transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                                                    >
                                                        Buy More Credits
                                                    </button>
                                                </div>

                                                {/* How Credits Work */}
                                                <div className="border-t border-white/10 pt-6">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">How It Works</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10">
                                                            <div className="w-6 h-6 bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs flex-shrink-0">1</div>
                                                            <div className="text-sm text-zinc-300">Purchase credits using Razorpay (secure payment)</div>
                                                        </div>
                                                        <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10">
                                                            <div className="w-6 h-6 bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs flex-shrink-0">2</div>
                                                            <div className="text-sm text-zinc-300">Each trip generation uses 1 credit</div>
                                                        </div>
                                                        <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10">
                                                            <div className="w-6 h-6 bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs flex-shrink-0">3</div>
                                                            <div className="text-sm text-zinc-300">Credits never expire – use them anytime</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Payment Provider */}
                                                <div className="flex items-center gap-4 text-sm text-zinc-300 p-4 bg-white/5 border border-white/10">
                                                    <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center">
                                                        <Check className="w-5 h-5 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">Secure Payments by Razorpay</div>
                                                        <div className="text-xs text-zinc-500">UPI, Cards, Netbanking, Wallets supported</div>
                                                    </div>
                                                </div>

                                                {/* Payment History */}
                                                <div className="border-t border-white/10 pt-6">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Payment History</h4>
                                                    <div className="space-y-3">
                                                        {loadingPayments ? (
                                                            <div className="text-center py-8 bg-white/5 border border-white/10">
                                                                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                                                                <div className="text-zinc-400 text-sm">Loading payment history...</div>
                                                            </div>
                                                        ) : paymentHistory.length === 0 ? (
                                                            <div className="text-center py-8 bg-white/5 border border-white/10">
                                                                <CreditCard className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                                                                <div className="text-zinc-400 text-sm">No payments yet</div>
                                                                <div className="text-zinc-600 text-xs mt-1">Your credit purchases will appear here</div>
                                                                <button
                                                                    onClick={() => setView(AppView.PRICING)}
                                                                    className="mt-4 px-6 py-2 bg-white/10 border border-white/20 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20 transition-all"
                                                                >
                                                                    Buy Credits
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            paymentHistory.map((payment) => (
                                                                <div key={payment.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-10 h-10 flex items-center justify-center ${payment.status === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                                                            {payment.status === 'success' ? (
                                                                                <Check className="w-5 h-5 text-emerald-400" />
                                                                            ) : (
                                                                                <X className="w-5 h-5 text-red-400" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-white font-bold text-sm">+{payment.credits_added} Credits</div>
                                                                            <div className="text-zinc-500 text-xs font-mono">
                                                                                {new Date(payment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-cyan-400 font-mono text-sm">₹{(payment.amount / 100).toFixed(0)}</div>
                                                                        <div className={`text-xs uppercase ${payment.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{payment.status}</div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* CALENDAR TAB */}
                                    {activeSettingsTab === 'calendar' && (
                                        <>
                                            <div className="mb-10 pb-6 border-b border-white/10">
                                                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Google Calendar</h3>
                                                <p className="text-sm text-zinc-500 font-mono">Sync your trips to Google Calendar.</p>
                                            </div>

                                            <div className="space-y-6">
                                                {/* Connection Status */}
                                                <div className={`p-6 border ${isGCalConnected ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 flex items-center justify-center ${isGCalConnected ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                                                                <Calendar className={`w-6 h-6 ${isGCalConnected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                                                            </div>
                                                            <div>
                                                                <div className="text-white font-bold">Google Calendar</div>
                                                                <div className={`text-xs ${isGCalConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                                    {isGCalConnected ? 'Connected' : 'Not connected'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-1 border text-xs font-bold uppercase ${isGCalConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'}`}>
                                                            {isGCalConnected ? 'Active' : 'Inactive'}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (isGCalConnected) {
                                                                googleCalendarService.disconnect();
                                                                setIsGCalConnected(false);
                                                            } else {
                                                                try {
                                                                    await googleCalendarService.connect();
                                                                    setIsGCalConnected(true);
                                                                } catch (e) {
                                                                    console.error(e);
                                                                }
                                                            }
                                                        }}
                                                        className={`w-full py-3 font-bold text-xs uppercase tracking-wider transition-all ${isGCalConnected ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-white text-black hover:bg-zinc-200'}`}
                                                    >
                                                        {isGCalConnected ? 'Disconnect Calendar' : 'Connect Google Calendar'}
                                                    </button>
                                                </div>

                                                {/* What gets synced */}
                                                <div className="border-t border-white/10 pt-6">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">What Gets Synced</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                                                            <Check className="w-4 h-4 text-emerald-400" />
                                                            <span className="text-sm text-zinc-300">Trip dates and duration</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                                                            <Check className="w-4 h-4 text-emerald-400" />
                                                            <span className="text-sm text-zinc-300">Daily activities and timings</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                                                            <Check className="w-4 h-4 text-emerald-400" />
                                                            <span className="text-sm text-zinc-300">Location details for each activity</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    }
                </div >
            </div >

            {/* DELETE CONFIRMATION MODAL */}
            < Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, trip: null, eventCount: 0 })}
                title="Remove from Calendar?"
                type="warning"
                confirmText="Remove Events"
                cancelText="Cancel"
                onConfirm={() => {
                    if (deleteModal.trip) {
                        executeDeleteSync(deleteModal.trip);
                    }
                }}
                onCancel={() => setDeleteModal({ isOpen: false, trip: null, eventCount: 0 })}
            >
                <p>
                    This will permanently delete <strong className="text-white">{deleteModal.eventCount} events</strong> from your Google Calendar.
                </p>
                <p className="mt-2 text-zinc-500 text-xs">
                    Trip: {deleteModal.trip?.destination || 'Unknown'}
                </p>
            </Modal >

            {/* RECONNECT MODAL */}
            < Modal
                isOpen={reconnectModal.isOpen}
                onClose={() => setReconnectModal({ isOpen: false, pendingAction: null })}
                title="Calendar Disconnected"
                type="info"
                confirmText="Reconnect"
                cancelText="Cancel"
                onConfirm={async () => {
                    setReconnectModal({ isOpen: false, pendingAction: null });
                    if (reconnectModal.pendingAction) {
                        await reconnectModal.pendingAction();
                    }
                }}
                onCancel={() => setReconnectModal({ isOpen: false, pendingAction: null })}
            >
                <p>
                    Your Google Calendar session has expired. Reconnect to continue syncing your trip.
                </p>
            </Modal >

            {/* CANCEL CONFIRMATION MODAL */}
            <Modal
                isOpen={cancelModal.isOpen}
                onClose={() => setCancelModal({ isOpen: false, tripId: null, destination: null })}
                title="Abort Mission?"
                type="warning"
                confirmText="Confirm Abort"
                cancelText="System Standby"
                onConfirm={confirmCancelMission}
                onCancel={() => setCancelModal({ isOpen: false, tripId: null, destination: null })}
            >
                <div className="space-y-4">
                    <p className="text-zinc-300">
                        Are you sure you want to cancel this mission? This action cannot be undone.
                    </p>
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 font-mono">
                        WARNING: This operation will freeze all active logistics for this mission.
                    </div>
                </div>
            </Modal>

            {/* SUCCESS GENERATION TOAST */}
            {
                successToast && successToastVisible && (
                    <div
                        onClick={() => {
                            if (successToast.promptId) {
                                const prompt = prompts.find(p => p.id === successToast.promptId);
                                if (prompt) handlePromptClick(prompt, { skipDelay: true });
                            } else if (successToast.tripId) {
                                const trip = trips.find(t => t.id === successToast.tripId);
                                if (trip) onLoadTrip(trip);
                            }
                            setSuccessToast(null);
                        }}
                        className="fixed bottom-6 right-6 z-[9999] animate-bounce-subtle cursor-pointer"
                    >
                        <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/50 p-4 rounded-lg shadow-2xl flex items-center gap-4 hover:bg-black transition-colors group min-w-[300px]">
                            <div className="bg-emerald-500/20 p-2 rounded-full group-hover:bg-emerald-500/30 transition-colors shrink-0">
                                <Check className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-emerald-400 text-sm uppercase tracking-wide">Mission Generated!</h4>
                                <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-[200px]">
                                    {successToast.destination}
                                </p>
                            </div>
                            <div className="pl-4 border-l border-white/10 shrink-0">
                                <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-wider flex items-center gap-1">
                                    View <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>

                    </div>
                )
            }

            {/* TOAST NOTIFICATIONS (Generic) */}
            {
                toastMessage && (
                    <div key={toastMessage.id} className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[10000] ${!toastAnimated ? 'animate-fade-in-up' : ''}`} style={{ bottom: successToastVisible ? '100px' : undefined }}>
                        <div className={`flex items-center gap-4 p-4 rounded-lg border backdrop-blur-xl shadow-2xl md:min-w-[300px] ${toastMessage.type === 'success' ? 'bg-black/90 border-emerald-500/50' :
                            toastMessage.type === 'error' ? 'bg-black/90 border-red-500/50' :
                                toastMessage.type === 'warning' ? 'bg-black/90 border-orange-500/50' :
                                    'bg-black/90 border-cyan-500/50'
                            }`}>
                            <div className={`p-2 rounded-full shrink-0 ${toastMessage.type === 'success' ? 'bg-emerald-500/20' :
                                toastMessage.type === 'error' ? 'bg-red-500/20' :
                                    toastMessage.type === 'warning' ? 'bg-orange-500/20' :
                                        'bg-cyan-500/20'
                                }`}>
                                {toastMessage.type === 'success' && <CheckCircle className={`w-5 h-5 ${toastMessage.type === 'success' ? 'text-emerald-400' : ''}`} />}
                                {toastMessage.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                                {toastMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-orange-400" />}
                                {toastMessage.type === 'info' && <Calendar className="w-5 h-5 text-cyan-400" />}
                            </div>

                            <div className="flex-1">
                                <h4 className={`font-bold text-sm uppercase tracking-wide ${toastMessage.type === 'success' ? 'text-emerald-400' :
                                    toastMessage.type === 'error' ? 'text-red-400' :
                                        toastMessage.type === 'warning' ? 'text-orange-400' :
                                            'text-cyan-400'
                                    }`}>
                                    {toastMessage.type === 'error' ? 'Error' : toastMessage.type === 'warning' ? 'Warning' : 'Notification'}
                                </h4>
                                <p className="text-sm text-zinc-300 mt-0.5 leading-snug">{toastMessage.message}</p>
                            </div>

                            <button
                                onClick={() => setToastMessage(null)}
                                className="p-1 text-zinc-500 hover:text-white transition-colors ml-2"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )
            }
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
            />

            {/* NEW: Interactive Share Editor Modal */}
            {isEditingShare && uploadedImage && (
                <div className="fixed inset-0 z-[2000] flex flex-col bg-black/95 backdrop-blur-xl">
                    <div className="flex-1 relative w-full h-full">
                        {/* Background Cropper with Filter */}
                        <div style={{ filter: imageFilter === 'grayscale' ? 'grayscale(100%)' : imageFilter === 'sepia' ? 'sepia(100%)' : imageFilter === 'blur' ? 'blur(8px)' : 'none', width: '100%', height: '100%', position: 'absolute' }}>
                            <Cropper
                                image={uploadedImage}
                                crop={crop}
                                zoom={zoom}
                                aspect={9 / 16}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={(croppedArea, croppedAreaPixels) => {
                                    setCroppedAreaPixels(croppedAreaPixels);
                                }}
                                classes={{ containerClassName: 'w-full h-full' }}
                            />
                        </div>

                        {/* Draggable Stats Overlay ("Data Pill" Design) */}
                        <motion.div
                            drag
                            dragMomentum={false}
                            dragElastic={0}
                            onDrag={(e, info) => {
                                setOverlayPosition({
                                    x: overlayPosition.x + info.delta.x,
                                    y: overlayPosition.y + info.delta.y
                                });
                            }}
                            style={{
                                x: overlayPosition.x,
                                y: overlayPosition.y,
                                scale: overlayScale,
                            }}
                            className="absolute z-10 flex flex-col gap-3 cursor-grab active:cursor-grabbing max-w-[80vw]"
                            // Center it initially relative to the screen
                            initial={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
                        >
                            {/* Theme Classes Helper for Cinematic Strava-style */}
                            {(() => {
                                const colors = {
                                    cyan: 'text-cyan-400 border-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] hex-[#22d3ee]',
                                    white: 'text-white border-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] hex-[#ffffff]',
                                    orange: 'text-orange-400 border-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] hex-[#fb923c]',
                                    emerald: 'text-emerald-400 border-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)] hex-[#34d399]'
                                };
                                const c = colors[overlayTheme];
                                const hexColor = c.split(' ').find(cls => cls.startsWith('hex-'))?.replace('hex-', '') || '#ffffff';
                                // Ensure hex is purely 6 characters for Mapbox
                                const cleanHex = hexColor.replace(/[^0-9a-fA-F]/g, '') || 'cccccc';

                                return (
                                    <div id="share-graphic" className="relative transition-all duration-500 overflow-hidden rounded-[40px] shadow-2xl flex flex-col p-8 bg-black/60 backdrop-blur-3xl border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden relative min-w-[280px]">
                                        {/* Dynamic glowing orb in the background */}
                                        <div className={`absolute top-0 right-0 w-32 h-32 -mt-10 -mr-10 opacity-30 blur-3xl rounded-full ${c.split(' ')[0].replace('text-', 'bg-')}`} />
                                        <div className={`absolute bottom-0 left-0 w-40 h-40 -mb-20 -ml-20 opacity-20 blur-[50px] rounded-full ${c.split(' ')[0].replace('text-', 'bg-')}`} />

                                        <div className="relative z-10 flex flex-col items-center w-full">

                                            {/* Top Logo - Colorful & Premium */}
                                            {showLogo && (
                                                <div className="flex items-center gap-2 mb-8 bg-white/10 px-4 py-2 rounded-full border border-white/10 shadow-lg backdrop-blur-md">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
                                                        <defs>
                                                            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                <stop offset="0%" stopColor="#fff" />
                                                                <stop offset="100%" stopColor={hexColor} />
                                                            </linearGradient>
                                                        </defs>
                                                        <path fillRule="evenodd" clipRule="evenodd" d="M11.999 19.829c-4.326 0-7.83-3.504-7.83-7.83S7.673 4.169 11.999 4.169 19.83 7.674 19.83 12s-3.504 7.829-7.831 7.829Zm-2.748-4.492h1.68l.899-2.28 1.026 2.222h1.611l-3.32-6.52h-1.638l-4.137 8.351h1.724l2.155-4.526 2.016 4.963-2.016-2.21Z" fill="url(#logoGrad)" />
                                                    </svg>
                                                    <span className="text-xs font-black tracking-[0.2em] text-white uppercase" style={{ fontFamily: "Outfit, system-ui, sans-serif" }}>VOYAGEUR</span>
                                                </div>
                                            )}

                                            {/* Metric Blocks - High-Tech Grid Style */}
                                            {showTitle && (
                                                <div className="w-full mb-6">
                                                    <div className="flex flex-col items-center mb-6">
                                                        <div className="text-[10px] text-zinc-400 font-bold tracking-[0.3em] uppercase mb-1 drop-shadow-sm">Destination</div>
                                                        <div className="text-4xl font-black text-white tracking-tighter leading-none text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70" style={{ fontFamily: "Outfit, system-ui, sans-serif" }}>
                                                            {sharingCity?.name}
                                                        </div>
                                                    </div>

                                                    {showStats && (
                                                        <div className="flex w-full bg-black/40 rounded-2xl p-4 border border-white/5 backdrop-blur-sm shadow-inner gap-4">
                                                            <div className="flex flex-col items-center flex-1">
                                                                <div className="text-[8px] text-zinc-500 font-bold tracking-[0.2em] uppercase mb-1">Locations</div>
                                                                <div className={`text-2xl font-black ${c.split(' ')[0]} tracking-tight leading-none`} style={{ fontFamily: "Outfit, system-ui, sans-serif" }}>
                                                                    {sharingCity?.count?.toString().padStart(2, '0')}
                                                                </div>
                                                            </div>
                                                            <div className="w-px bg-white/10" />
                                                            <div className="flex flex-col items-center flex-1">
                                                                <div className="text-[8px] text-zinc-500 font-bold tracking-[0.2em] uppercase mb-1">Status</div>
                                                                <div className="text-lg font-bold text-white tracking-tight leading-none mt-1">
                                                                    Verified
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Topographic Map Visual */}
                                            {showStats && mapCenter && (
                                                <div className="w-full h-32 mt-4 rounded-2xl overflow-hidden relative border border-white/10 shadow-inner group flex items-center justify-center bg-zinc-900">
                                                    {/* Outer glow matching the theme */}
                                                    <div className={`absolute inset-0 opacity-20 transition-opacity duration-1000 ${c.split(' ')[0].replace('text-', 'bg-')}`} style={{ mixBlendMode: 'overlay' }} />

                                                    {/* Real Map Image (TomTom) */}
                                                    <img
                                                        src={`https://api.tomtom.com/map/1/staticimage?key=${import.meta.env.VITE_TOMTOM_API_KEY}&zoom=8&center=${mapCenter.lng},${mapCenter.lat}&format=png&layer=basic&style=night&width=400&height=200`}
                                                        alt="Map"
                                                        className="w-full h-full object-cover opacity-80 mix-blend-screen mix-blend-lighten grayscale-[30%] contrast-125 saturate-50 absolute inset-0 z-0"
                                                        crossOrigin="anonymous"
                                                    />

                                                    {/* Map Pin Overlay */}
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none drop-shadow-xl">
                                                        <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded shadow-xl border border-white/20 flex items-center gap-2 mb-1">
                                                            <MapPin className="w-3 h-3" style={{ color: hexColor }} />
                                                            <span className="text-white font-bold text-[10px] tracking-wider uppercase leading-none">{sharingCity?.name}</span>
                                                        </div>
                                                        <div className="w-1.5 h-1.5 rotate-45 bg-black/80 border-r border-b border-white/20 -mt-2"></div>
                                                    </div>

                                                    {/* Radar Scanning Line Effect OVER the map */}
                                                    <div className="absolute top-0 left-0 w-full h-[2px] opacity-50 shadow-[0_0_10px_#fff] animate-[scan_3s_ease-in-out_infinite] z-30" style={{ backgroundColor: hexColor }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </div>

                    {/* Bottom Control Bar with Advanced Options */}
                    <div className="bg-black/90 border-t border-white/10 flex flex-col relative z-20 pb-safe">

                        {/* Customization Toolbar */}
                        <div className="px-5 py-4 flex flex-col gap-5 border-b border-white/5 overflow-x-auto no-scrollbar">

                            {/* Row 1: Scale & Theme */}
                            <div className="flex items-center gap-6 shrink-0">
                                {/* Scale Slider */}
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Scale</span>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1.5"
                                        step="0.05"
                                        value={overlayScale}
                                        onChange={(e) => setOverlayScale(parseFloat(e.target.value))}
                                        className="w-24 accent-cyan-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                {/* Theme Swatches */}
                                <div className="flex items-center gap-3 border-l border-white/10 pl-6">
                                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Text Color</span>
                                    <div className="flex gap-2">
                                        {['cyan', 'white', 'orange', 'emerald'].map((theme) => (
                                            <button
                                                key={theme}
                                                onClick={() => setOverlayTheme(theme as any)}
                                                className={`w-5 h-5 rounded-full border transition-all ${overlayTheme === theme ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                                                    } ${theme === 'cyan' ? 'bg-cyan-400' :
                                                        theme === 'white' ? 'bg-white' :
                                                            theme === 'orange' ? 'bg-orange-400' :
                                                                'bg-emerald-400'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Elements & Filters */}
                            <div className="flex items-center justify-between gap-6 shrink-0">
                                {/* Element Visibility Toggles */}
                                <div className="flex gap-3">
                                    {[
                                        { label: 'Logo', state: showLogo, toggle: setShowLogo },
                                        { label: 'Title', state: showTitle, toggle: setShowTitle },
                                        { label: 'Stats', state: showStats, toggle: setShowStats }
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={() => item.toggle(!item.state)}
                                            className={`px-3 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest transition-colors flex items-center gap-1 leading-none ${item.state ? 'bg-white/10 text-white border border-white/20' : 'bg-transparent text-zinc-600 border border-zinc-700/50 hover:text-zinc-400'
                                                }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Image Filters */}
                                <div className="flex gap-2 border-l border-white/10 pl-6">
                                    {['none', 'grayscale', 'sepia', 'blur'].map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setImageFilter(filter as any)}
                                            className={`px-3 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest transition-colors leading-none ${imageFilter === filter ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-transparent text-zinc-600 border border-zinc-700/50 hover:text-zinc-400'
                                                }`}
                                        >
                                            {filter === 'none' ? 'Normal' : filter}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-6 flex gap-4">
                            <button
                                onClick={() => {
                                    setIsEditingShare(false);
                                    setUploadedImage(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded font-bold uppercase tracking-wider hover:bg-zinc-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isSharing}
                                onClick={async () => {
                                    if (!croppedAreaPixels || !uploadedImage) return;
                                    try {
                                        setIsSharing(true);
                                        // 1. Get the perfectly cropped image based on easy-crop boundaries
                                        const croppedImageSrc = await getCroppedImg(uploadedImage, croppedAreaPixels);

                                        // 2. Set this image to the hidden share card
                                        const hiddenImg = document.getElementById('voyageur-share-img') as HTMLImageElement;
                                        if (hiddenImg) {
                                            hiddenImg.crossOrigin = 'anonymous';
                                            hiddenImg.src = croppedImageSrc;
                                            // Wait for it to load
                                            await new Promise((resolve) => {
                                                hiddenImg.onload = resolve;
                                                setTimeout(resolve, 1000); // safety
                                            });
                                        }

                                        // 3. Update the hidden share card overlay to absolutely position exactly where the user placed it visually
                                        // We calculate the relative displacement of the draggable overlay within its crop container
                                        const editorContainer = document.querySelector('.reactEasyCrop_Container');
                                        const overlay = document.querySelector('[draggable="false"]')?.closest('.cursor-grab');
                                        const targetOverlay = document.getElementById('voyageur-share-overlay');

                                        const containerRect = editorContainer.getBoundingClientRect();
                                        const overlayRect = overlay.getBoundingClientRect();

                                        const cropAreaRect = document.querySelector('.reactEasyCrop_CropArea')?.getBoundingClientRect() || containerRect;

                                        // We map the X/Y percentages from the actual crop box visual screen to the explicit 1080x1920 space.
                                        const xPercent = (overlayRect.left - cropAreaRect.left) / cropAreaRect.width;
                                        const yPercent = (overlayRect.top - cropAreaRect.top) / cropAreaRect.height;

                                        const finalLeftPx = xPercent * 1080;
                                        const finalTopPx = yPercent * 1920;

                                        // Now we scale the overlay node itself.
                                        // Because the `targetOverlay` DOM element classes are 1x scale (the same size as the preview screen),
                                        // we must mathematically scale it UP so it takes up the exact same proportional space on a 1080px width canvas
                                        // as it did on the ~300px width visual preview screen. THEN we apply the user's custom layout scale.
                                        const canvasToScreenRatio = 1080 / cropAreaRect.width;
                                        const finalScale = canvasToScreenRatio * overlayScale;

                                        targetOverlay.style.left = `${finalLeftPx}px`;
                                        targetOverlay.style.top = `${finalTopPx}px`;
                                        targetOverlay.style.transform = `scale(${finalScale})`;
                                        targetOverlay.style.transformOrigin = 'top left';
                                        // Ensure the DOM updates before snapshotting
                                        await new Promise(r => setTimeout(r, 100));

                                        // 4. Generate Canvas
                                        await generateShareCanvas();
                                    } catch (e) {
                                        console.error("Failed to process crop", e);
                                        showToast("Failed to process image.", "error");
                                        setIsSharing(false);
                                    }
                                }}
                                className="flex-1 py-3 px-4 bg-cyan-500 text-black rounded font-bold uppercase tracking-wider hover:bg-cyan-400 transition flex items-center justify-center gap-2"
                            >
                                {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next <ChevronRight className="w-5 h-5" /></>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Preview Modal (Captured Image) */}
            {
                shareBlob && sharePreviewUrl && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                        <div className="flex flex-col items-center gap-6 max-w-sm w-full">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">Intel Ready</h3>
                                <p className="text-sm text-zinc-400">Your personalized passport stamp is generated and ready for deployment.</p>
                            </div>

                            <div className="relative w-[300px] h-[533px] rounded-lg overflow-hidden border border-white/20 shadow-2xl shrink-0 bg-zinc-900">
                                <img src={sharePreviewUrl} alt="Share Preview" className="w-full h-full object-cover" />
                                {/* Faux gloss reflection */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
                            </div>

                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => {
                                        setShareBlob(null);
                                        setSharePreviewUrl(null);
                                        setUploadedImage(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded font-bold uppercase tracking-wider hover:bg-zinc-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        const file = new File([shareBlob], `voyageur-${sharingCity?.name || 'intel'}.png`, { type: 'image/png' });
                                        try {
                                            // Final Share Action (Direct User Gesture)
                                            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                await navigator.share({
                                                    title: 'Mission Accomplished',
                                                    text: `I've explored ${sharingCity?.name} on Voyageur!`,
                                                    files: [file]
                                                });
                                            } else {
                                                // Fallback
                                                const link = document.createElement('a');
                                                link.download = file.name;
                                                link.href = sharePreviewUrl;
                                                link.click();
                                                showToast("Graphic saved to your device!", "success");
                                            }
                                        } catch (e: any) {
                                            console.warn("Share aborted or failed:", e);
                                        } finally {
                                            // Cleanup
                                            setShareBlob(null);
                                            setSharePreviewUrl(null);
                                            setSharingCity(null);
                                            setUploadedImage(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }
                                    }}
                                    className="flex-1 py-3 px-4 bg-cyan-500 text-black rounded font-bold uppercase tracking-wider hover:bg-cyan-400 transition flex justify-center items-center gap-2"
                                >
                                    <Share2 className="w-5 h-5" /> Share
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* HIDDEN HTML2CANVAS NODE (Positioned off-screen) */}
            <div
                id="voyageur-share-card"
                className="fixed top-[-10000px] left-[-10000px] w-[1080px] h-[1920px] bg-black overflow-hidden pointer-events-none"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
                {/* Background Styling (User Image or Default) with Filter */}
                <img
                    id="voyageur-share-img"
                    src={uploadedImage || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=3544&auto=format&fit=crop"}
                    alt="bg"
                    crossOrigin="anonymous"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: imageFilter === 'grayscale' ? 'grayscale(100%)' : imageFilter === 'sepia' ? 'sepia(100%)' : imageFilter === 'blur' ? 'blur(16px)' : 'none' }}
                />

                {/* Draggable Overlay Logic Target: Cinematic Strava-style */}
                {(() => {
                    const colors = {
                        cyan: 'text-cyan-400 border-cyan-400 drop-shadow-[0_0_45px_rgba(6,182,212,0.8)] hex-[#22d3ee]',
                        white: 'text-white border-white drop-shadow-[0_0_45px_rgba(255,255,255,0.8)] hex-[#ffffff]',
                        orange: 'text-orange-400 border-orange-400 drop-shadow-[0_0_45px_rgba(249,115,22,0.8)] hex-[#fb923c]',
                        emerald: 'text-emerald-400 border-emerald-400 drop-shadow-[0_0_45px_rgba(52,211,153,0.8)] hex-[#34d399]'
                    };
                    const c = colors[overlayTheme]; // We use the current state theme here
                    const hexColor = c.split(' ').find(cls => cls.startsWith('hex-'))?.replace('hex-', '') || '#ffffff';

                    // Ensure hex is purely 6 characters for Mapbox
                    const cleanHex = hexColor.replace(/[^0-9a-fA-F]/g, '') || 'cccccc';

                    return (
                        <div id="voyageur-share-overlay" className="absolute" style={{ transformOrigin: 'top left' }}>
                            <div className="flex flex-col p-8 rounded-[40px] bg-black/60 backdrop-blur-3xl border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden relative min-w-[280px]">
                                {/* Dynamic glowing orb in the background */}
                                <div className={`absolute top-0 right-0 w-32 h-32 -mt-10 -mr-10 opacity-30 blur-3xl rounded-full ${c.split(' ')[0].replace('text-', 'bg-')}`} />
                                <div className={`absolute bottom-0 left-0 w-40 h-40 -mb-20 -ml-20 opacity-20 blur-[50px] rounded-full ${c.split(' ')[0].replace('text-', 'bg-')}`} />

                                <div className="relative z-10 flex flex-col items-center w-full">

                                    {/* Top Logo - Colorful & Premium */}
                                    {showLogo && (
                                        <div className="flex items-center gap-2 mb-8 bg-white/10 px-4 py-2 rounded-full border border-white/10 shadow-lg backdrop-blur-md">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
                                                <defs>
                                                    <linearGradient id="logoGradPrint" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#fff" />
                                                        <stop offset="100%" stopColor={hexColor} />
                                                    </linearGradient>
                                                </defs>
                                                <path fillRule="evenodd" clipRule="evenodd" d="M11.999 19.829c-4.326 0-7.83-3.504-7.83-7.83S7.673 4.169 11.999 4.169 19.83 7.674 19.83 12s-3.504 7.829-7.831 7.829Zm-2.748-4.492h1.68l.899-2.28 1.026 2.222h1.611l-3.32-6.52h-1.638l-4.137 8.351h1.724l2.155-4.526 2.016 4.963-2.016-2.21Z" fill="url(#logoGradPrint)" />
                                            </svg>
                                            <span className="text-xs font-black tracking-[0.2em] text-white uppercase" style={{ fontFamily: "Outfit, system-ui, sans-serif" }}>VOYAGEUR</span>
                                        </div>
                                    )}

                                    {/* Metric Blocks - High-Tech Grid Style */}
                                    {showTitle && (
                                        <div className="w-full mb-6">
                                            <div className="flex flex-col items-center mb-6">
                                                <div className="text-[10px] text-zinc-400 font-bold tracking-[0.3em] uppercase mb-1 drop-shadow-sm">Destination</div>
                                                <div className="text-4xl font-black text-white tracking-tighter leading-none text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70" style={{ fontFamily: "Outfit, system-ui, sans-serif" }}>
                                                    {sharingCity?.name}
                                                </div>
                                            </div>

                                            {showStats && (
                                                <div className="flex w-full bg-black/40 rounded-2xl p-4 border border-white/5 backdrop-blur-sm shadow-inner gap-4">
                                                    <div className="flex flex-col items-center flex-1">
                                                        <div className="text-[8px] text-zinc-500 font-bold tracking-[0.2em] uppercase mb-1">Locations</div>
                                                        <div className={`text-2xl font-black ${c.split(' ')[0]} tracking-tight leading-none`} style={{ fontFamily: "Outfit, system-ui, sans-serif" }}>
                                                            {sharingCity?.count?.toString().padStart(2, '0')}
                                                        </div>
                                                    </div>
                                                    <div className="w-px bg-white/10" />
                                                    <div className="flex flex-col items-center flex-1">
                                                        <div className="text-[8px] text-zinc-500 font-bold tracking-[0.2em] uppercase mb-1">Status</div>
                                                        <div className="text-lg font-bold text-white tracking-tight leading-none mt-1">
                                                            Verified
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Topographic Map Visual */}
                                    {showStats && mapCenter && (
                                        <div className="w-full h-32 mt-4 rounded-2xl overflow-hidden relative border border-white/10 shadow-inner group flex items-center justify-center bg-zinc-900">
                                            {/* Outer glow matching the theme */}
                                            <div className={`absolute inset-0 opacity-20 transition-opacity duration-1000 ${c.split(' ')[0].replace('text-', 'bg-')}`} style={{ mixBlendMode: 'overlay' }} />

                                            {/* Real Map Image (TomTom) */}
                                            <img
                                                src={`https://api.tomtom.com/map/1/staticimage?key=${import.meta.env.VITE_TOMTOM_API_KEY}&zoom=8&center=${mapCenter.lng},${mapCenter.lat}&format=png&layer=basic&style=night&width=400&height=200`}
                                                alt="Map"
                                                className="w-full h-full object-cover opacity-80 mix-blend-screen mix-blend-lighten grayscale-[30%] contrast-125 saturate-50 absolute inset-0 z-0"
                                                crossOrigin="anonymous"
                                            />

                                            {/* Map Pin Overlay */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none drop-shadow-xl">
                                                <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded shadow-xl border border-white/20 flex items-center gap-2 mb-1">
                                                    <MapPin className="w-3 h-3" style={{ color: hexColor }} />
                                                    <span className="text-white font-bold text-[10px] tracking-wider uppercase leading-none">{sharingCity?.name}</span>
                                                </div>
                                                <div className="w-1.5 h-1.5 rotate-45 bg-black/80 border-r border-b border-white/20 -mt-2"></div>
                                            </div>

                                            {/* Static Scan Line for Print */}
                                            <div className="absolute top-[30%] left-0 w-full h-[2px] opacity-50 shadow-[0_0_10px_#fff]" style={{ backgroundColor: hexColor }} />

                                            {/* Vignette to blend edges */}
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </>
    );
};

export default Dashboard;
