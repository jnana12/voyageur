import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Loader2, Calendar, MapPin, DollarSign, Clock, CheckCircle, ArrowRight, Plane, Train, Bus, Car, Hotel, Bed, Star, Map as MapIcon, Navigation, ChevronDown, ChevronRight, Bookmark, Sparkles, ShieldCheck, Ticket, Users, CornerDownRight, Footprints, Camera, Utensils, Music, Info, X, History, Edit2, Save, Menu, ChevronLeft, Terminal, ExternalLink, RefreshCw, Zap, Wallet, FileDown, CloudRain, Power, Settings } from 'lucide-react';
import { generateItinerary, regenerateItineraryDays, analyzeTripRequest, TripAnalysis } from '../services/geminiService';
import { runValidationProtocol } from '../services/validationService';
import { dbService } from '../services/dbService';
import { supabase } from '../services/supabaseClient';
import { googleCalendarService } from '../services/googleCalendarService';
import { ConfirmationModal } from './ConfirmationModal';
import { useSquadSync } from '../hooks/useSquadSync';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { TripItinerary, AppView, UserProfile } from '../types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DayMap, getPlaceLink, getDirectionsLink, getCoordinatesLink } from './DayMap';
import { getPlaceImage, PlaceImage } from '../services/imageService';
import LoadingScreen from './LoadingScreen';
import { ScrambleText } from './ui/ScrambleText';
import SurpriseMe from './SurpriseMe';
import { OriginSelector } from './OriginSelector';
import { presenceService } from '../services/presenceService';
// useSquadSync already imported
import { SquadSidebar } from './SquadSidebar';
import { ObjectivePoll } from './ObjectivePoll';
import { AdminSettingsModal } from './AdminSettingsModal';

// Helper for place names
const cleanDestination = (dest: string | undefined | null) => {
    if (!dest) return '';

    // 1. Initial Split
    let cleaned = dest.split(':')[0];
    cleaned = cleaned.split(' - ')[0];

    // 2. Remove Common Duration Patterns
    cleaned = cleaned.replace(/,\s*\d+\s+Days?$/i, '');

    // 3. Remove Special Characters/Typos
    cleaned = cleaned.replace(/[()*{}^%$#@!]/g, '');

    // 4. Title Case
    cleaned = cleaned.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return cleaned.trim();
};

// Helper to determine if an activity has a pinpointable location
const shouldShowMapButton = (activity: any) => {
    if (!activity) return false;
    const name = (activity.location || activity.title || '').toLowerCase();

    // List of generic terms that don't represent a specific physical landmark/place
    const genericTerms = [
        'lunch', 'dinner', 'breakfast', 'brunch', 'snack', 'meal',
        'travel to', 'transit to', 'check-in', 'rest', 'leisure',
        'free time', 'evening stroll', 'coffee break', 'relax'
    ];

    // If the name is very short or contains generic terms without a specific location
    const isGeneric = genericTerms.some(term => name.includes(term));

    // If it has coordinates, we always show it
    if (activity.coordinates) return true;

    // Otherwise, show only if it's not generic
    return !isGeneric || (activity.location && activity.location.length > 15);
};

interface TripPlannerProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    isLoggedIn: boolean;
    user: UserProfile | null;
    setView: (view: AppView) => void;
    setNavVisible: (visible: boolean) => void;
    initialTrip?: any | null;
    clearSelectedTrip?: () => void;
    onBackToLogs?: () => void;
}

type Tab = 'TRAVEL' | 'STAY' | 'ITINERARY';
type WizardState = 'INPUT' | 'SURPRISE_ME' | 'CLARIFYING' | 'GENERATING' | 'RESULTS';

const HOTEL_IMAGES = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80"
];

const TacticalBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Ambient Glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-cyan-900/20 blur-[120px] rounded-full mix-blend-screen" />

        {/* 3D Grid Floor */}
        <div
            className="absolute inset-0 opacity-30"
            style={{
                backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
                transform: 'perspective(1000px) rotateX(60deg) translateY(200px) scale(2)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)'
            }}
        />

        {/* HUD Circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] border border-cyan-500/5 rounded-full animate-[spin_120s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] border border-dashed border-cyan-500/10 rounded-full animate-[spin_60s_linear_infinite_reverse]" />
    </div>
);

const TripPlanner: React.FC<TripPlannerProps> = ({ prompt, setPrompt, isLoggedIn, user, setView, setNavVisible, initialTrip, clearSelectedTrip, onBackToLogs }) => {
    const [loading, setLoading] = useState(false);
    const [wizardState, setWizardState] = useState<WizardState>(initialTrip ? 'RESULTS' : 'INPUT');
    const [analysis, setAnalysis] = useState<TripAnalysis | null>(null);
    const [selections, setSelections] = useState<Record<string, string>>({});

    // Sequential Question State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [customAnswer, setCustomAnswer] = useState('');

    // Initialize state from initialTrip prop to ensure immediate rendering
    const getInitialItinerary = (): TripItinerary | null => {
        if (!initialTrip || !initialTrip.data) return null;
        let data = initialTrip.data;
        if (typeof data === 'string') {
            try { return JSON.parse(data); } catch { return null; }
        }
        return data;
    };

    const [itinerary, setItinerary] = useState<TripItinerary | null>(getInitialItinerary);
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>(() => initialTrip ? 'ITINERARY' : 'TRAVEL');

    // History & Edit State
    const [currentTripId, setCurrentTripId] = useState<string | null>(() => initialTrip?.id || null);
    const [tripOwnerId, setTripOwnerId] = useState<string | null>(() => initialTrip?.user_id || null);
    const [isEditing, setIsEditing] = useState(false);

    // --- SQUAD SYNC integration ---
    const {
        members,
        presence,
        messages,
        rawMessages,
        polls,
        votes,
        userVotes,
        missionCode,
        sendMessage,
        createPoll,
        castVote,
        refreshMissionCode,
        refreshSquad,
        isLoading: isSquadLoading
    } = useSquadSync(currentTripId, user?.id || null);

    const handleAbort = () => {
        if (!currentTripId || !user) {
            if (onBackToLogs) onBackToLogs();
            return;
        }

        const isOwner = tripOwnerId === user.id || !tripOwnerId;

        const confirmMsg = isOwner
            ? "Are you sure you want to abort this mission? It will be deleted permanently."
            : "Are you sure you want to leave this mission?";

        setConfirmation({
            isOpen: true,
            title: isOwner ? 'Abort Mission' : 'Leave Squad',
            message: confirmMsg,
            type: 'danger',
            onConfirm: async () => {
                try {
                    if (isOwner) {
                        await dbService.deleteTrip(user.id, currentTripId);
                    } else {
                        await dbService.leaveSquad(user.id, currentTripId);
                    }

                    // Also dispatch db-update to refresh dashboard lists if any
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:db-update'));

                    if (onBackToLogs) onBackToLogs();
                } catch (error) {
                    console.error("Failed to abort mission:", error);
                    alert("Failed to abort mission. Please try again.");
                }
            }
        });
    };

    const isSquadMember = useMemo(() => {
        if (!user?.id || !members) return false;
        return members.some(m => m.user_id === user.id);
    }, [members, user?.id]);

    // Consolidated Ownership Logic
    const isOwner = useMemo(() => {
        const userId = user?.id;
        // 1. If no owner ID exists yet, current user IS the owner (creating new trip)
        if (!tripOwnerId || tripOwnerId === 'null') return true;
        // 2. If owner ID exists, it must match current user ID
        return userId === tripOwnerId;
    }, [tripOwnerId, user?.id]);

    const isAdmin = useMemo(() => {
        if (isOwner) return true;
        if (!user?.id || !members) return false;
        // Owners or Captains are admins
        return members.some(m => m.user_id === user.id && (m.role === 'Captain' || m.role === 'Admin'));
    }, [isOwner, members, user?.id]);


    const [selectedTravelIndex, setSelectedTravelIndex] = useState<number | null>(null);
    const [selectedHotelIndex, setSelectedHotelIndex] = useState<number | null>(null);
    const [activeDay, setActiveDay] = useState<number>(0);
    const [expandedNode, setExpandedNode] = useState<number | null>(null);
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'processing' | 'confirmed'>('idle');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [confirmedTrips, setConfirmedTrips] = useState<any[]>([]);
    const [dateConflictWarning, setDateConflictWarning] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<string>(''); // "3/12" or "25%"
    const [calendarEventIds, setCalendarEventIds] = useState<string[]>(() => {
        if (!initialTrip || !initialTrip.data) return [];
        let data = initialTrip.data;
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                return parsed.calendarEventIds || [];
            } catch { return []; }
        }
        return data.calendarEventIds || [];
    });
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [auditLog, setAuditLog] = useState<any[]>([]);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false); // Sidebar Map State
    const [showCreditAlert, setShowCreditAlert] = useState(false); // NEW: Custom Credit Alert Modal
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [nodeImage, setNodeImage] = useState<PlaceImage | null>(null);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false); // Admin Modal State

    // --- SQUAD SYNC integration ---


    const canConfirm = useMemo(() => {
        return isAdmin;
    }, [isAdmin]);

    // --- VOICE CHAT ---
    // Extract comms settings directly from the itinerary
    const commSettings = itinerary?.comm_settings;

    // REMOVED: Redundant useVoiceChat hook.
    // SquadSidebar handles the active voice connection.
    // This prevents double-audio binding.

    // --- WEATHER SERVICE ---
    const [weather, setWeather] = useState<any>(null);
    useEffect(() => {
        if (!itinerary?.days?.[0]?.activities?.[0]?.coordinates) return;
        const coords = itinerary.days[0].activities[0].coordinates;
        if (coords.lat && coords.lng) {
            import('../services/weatherService').then(({ fetchWeather }) => {
                fetchWeather(coords.lat, coords.lng).then(setWeather);
            });
        }
    }, [itinerary]);

    // REMOVED: Redundant presence tracking.
    // useSquadSync hook now manages presenceService.startTracking() automatically.
    // This prevents race conditions where TripPlanner stops/starts tracking unnecessarily.
    /*
    useEffect(() => {
        if (currentTripId && user?.id && wizardState === 'RESULTS' && itinerary?.status === 'confirmed') {
            presenceService.startTracking(user.id, currentTripId);
        } else {
            presenceService.stopTracking();
        }
        return () => presenceService.stopTracking();
    }, [currentTripId, user?.id, wizardState, itinerary?.status]);
    */

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
    const dayScrollRef = useRef<HTMLDivElement>(null); // Ref for Day Tabs Container

    // Drag-to-Scroll Refs
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const [isScrolled, setIsScrolled] = useState(false);

    // SLIDING TABS STATE
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const tabContainerRef = useRef<HTMLDivElement | null>(null);

    // SLIDING TABS EFFECT - Use useLayoutEffect and ResizeObserver for perfect sync
    useLayoutEffect(() => {
        const container = tabContainerRef.current;
        if (!container) return;

        const updateIndicator = () => {
            const activeBtn = tabsRef.current[activeTab];
            if (activeBtn && container) {
                const containerRect = container.getBoundingClientRect();
                const btnRect = activeBtn.getBoundingClientRect();
                setIndicatorStyle({
                    left: btnRect.left - containerRect.left,
                    width: btnRect.width
                });
            }
        };

        // Update on initial mount and tab changes
        updateIndicator();

        // Also update on container resize
        const observer = new ResizeObserver(updateIndicator);
        observer.observe(container);

        return () => observer.disconnect();
    }, [activeTab, isMobile]);

    // === MODAL STATE ===
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type?: 'info' | 'success' | 'warning' | 'danger';
        onConfirm?: () => void;
        singleAction?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: ''
    });

    const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; id: number } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        setToastMessage({ message, type, id: Date.now() });
    };

    // Auto-dismiss toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage?.id]);

    // === DYNAMIC COST CALCULATION ===
    // Parse price string like "₹5,000", "$350", "₹8,000" to number
    const parseCost = (costStr: string | undefined): number => {
        if (!costStr) return 0;
        const match = costStr.match(/[\d,]+/);
        return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
    };

    // Parse duration string like "5 Days" to get number of nights (days - 1)
    const parseNights = (duration: string | undefined): number => {
        if (!duration) return 1;
        const match = duration.match(/(\d+)/);
        return match ? Math.max(1, parseInt(match[1]) - 1) : 1;
    };

    // Dynamically calculate total cost based on selections
    const calculatedCost = useMemo(() => {
        if (!itinerary) return null;

        const nights = parseNights(itinerary.duration);

        // Travel cost (selected or first option as default)
        const travelIdx = selectedTravelIndex ?? 0;
        const travelCost = parseCost(itinerary.travelOptions?.[travelIdx]?.price);

        // Accommodation cost (selected hotel × nights)
        const hotelIdx = selectedHotelIndex ?? 0;
        const hotelCost = parseCost(itinerary.accommodation?.[hotelIdx]?.pricePerNight) * nights;

        // Activity costs (sum of all activities across all days)
        let activityCost = 0;
        itinerary.days?.forEach(day => {
            day.activities?.forEach(activity => {
                activityCost += parseCost(activity.estimatedCost);
            });
        });

        return travelCost + hotelCost + activityCost;
    }, [itinerary, selectedTravelIndex, selectedHotelIndex]);

    // Formatted cost string with currency symbol
    const formattedCost = calculatedCost !== null
        ? `₹${calculatedCost.toLocaleString('en-IN')}`
        : itinerary?.totalEstimatedCost || '—';

    // === AUTO-SELECT BEST OPTIONS ===
    // Find the index of the cheapest travel option
    const findBestTravelIndex = (options: typeof itinerary.travelOptions): number => {
        if (!options || options.length === 0) return 0;
        let bestIdx = 0;
        let bestPrice = Infinity;
        options.forEach((opt, idx) => {
            const price = parseCost(opt.price);
            if (price > 0 && price < bestPrice) {
                bestPrice = price;
                bestIdx = idx;
            }
        });
        return bestIdx;
    };

    // Find the index of the best-rated hotel (or cheapest if no ratings)
    const findBestHotelIndex = (hotels: typeof itinerary.accommodation): number => {
        if (!hotels || hotels.length === 0) return 0;
        let bestIdx = 0;
        let bestRating = 0;
        hotels.forEach((hotel, idx) => {
            // Parse rating like "4.5" or "4.5/5"
            const ratingMatch = hotel.rating?.match(/[\d.]+/);
            const rating = ratingMatch ? parseFloat(ratingMatch[0]) : 0;
            if (rating > bestRating) {
                bestRating = rating;
                bestIdx = idx;
            }
        });
        return bestIdx;
    };

    // Auto-select best options when itinerary changes (and selections are null)
    useEffect(() => {
        if (itinerary && selectedTravelIndex === null && itinerary.travelOptions?.length > 0) {
            const bestTravel = findBestTravelIndex(itinerary.travelOptions);
            setSelectedTravelIndex(bestTravel);
            console.log('🎯 [AutoSelect] Best travel option:', bestTravel);
        }
        if (itinerary && selectedHotelIndex === null && itinerary.accommodation?.length > 0) {
            const bestHotel = findBestHotelIndex(itinerary.accommodation);
            setSelectedHotelIndex(bestHotel);
            console.log('🏨 [AutoSelect] Best hotel option:', bestHotel);
        }
    }, [itinerary, selectedTravelIndex, selectedHotelIndex]);

    const BASE_STEP_Y = 160;
    const EXPANDED_EXTRA_HEIGHT = isMobile ? 20 : 480;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setIsScrolled(window.scrollY > 50);
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', handleScroll);

        if (user) {
            // Fetch confirmed trips for date exclusion
            const fetchConfirmed = async () => {
                const trips = await dbService.getTrips(user.id);
                const confirmed = trips.filter(t => t.status === 'confirmed');
                setConfirmedTrips(confirmed);
            };
            fetchConfirmed();
        }

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [user, initialTrip]);

    // Add Horizontal Scroll on Wheel for Day Tabs
    useEffect(() => {
        const el = dayScrollRef.current;
        if (el) {
            const onWheel = (e: WheelEvent) => {
                if (e.deltaY === 0) return;
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            };
            el.addEventListener('wheel', onWheel);
            return () => el.removeEventListener('wheel', onWheel);
        }
    }, [activeTab, itinerary]); // Re-bind when tab/itinerary changes ensures ref is mounted

    // Handle initialTrip when navigation from Dashboard
    useEffect(() => {
        if (initialTrip) {
            console.log("🔍 [TripPlanner] initialTrip prop change:", initialTrip);
            handleLoadTrip(initialTrip);
        }

        // NO CLEANUP HERE. 
        // Clearing selectedTrip on unmount causes issues with React StrictMode (double mount/unmount).
        // Instead, we explicitly clear it when starting a NEW trip from Dashboard.
    }, [initialTrip]);

    // NEW: Hide Navigation when Modal is Open
    useEffect(() => {
        if (showConfirmModal) {
            setNavVisible(false);
        } else {
            setNavVisible(true);
        }
        return () => setNavVisible(true);
    }, [showConfirmModal, setNavVisible]);


    // NEW: Restore prompt from localStorage if returning from Pricing
    useEffect(() => {
        const savedPrompt = localStorage.getItem('voyageur_saved_prompt');
        if (savedPrompt) {
            console.log("📝 [TripPlanner] Restoring saved prompt:", savedPrompt);
            setPrompt(savedPrompt);
            localStorage.removeItem('voyageur_saved_prompt');
        }
    }, []);

    const handleLoadTrip = (trip: any) => {
        console.log("🔍 [TripPlanner] handleLoadTrip START", trip);

        if (!trip || !trip.data) {
            console.error("❌ [TripPlanner] Invalid trip data:", trip);
            return;
        }

        let itineraryData = trip.data;
        // Defensive: Parse if it's a string (shouldn't be, but just in case)
        if (typeof itineraryData === 'string') {
            try {
                itineraryData = JSON.parse(itineraryData);
            } catch (e) {
                console.error("❌ [TripPlanner] Failed to parse trip.data string", e);
                return; // Early return on parse failure to prevent state corruption
            }
        }

        // Inject status from the StoredTrip wrapper if present
        if (trip.status) {
            itineraryData = { ...itineraryData, status: trip.status };
        }

        console.log("✅ [TripPlanner] Setting itinerary state:", itineraryData);
        console.log("🔍 [TripPlanner] Original Prompt Field:", itineraryData.originalPrompt);
        console.log("🔍 [TripPlanner] Destination Field:", cleanDestination(trip.destination));

        setItinerary(itineraryData);
        setCurrentTripId(trip.id);
        setTripOwnerId(trip.user_id || null);
        // Use originalPrompt if available (new trips), otherwise fallback to destination (old trips)
        const promptToSet = itineraryData.originalPrompt || cleanDestination(trip.destination) || "";
        console.log("🎯 [TripPlanner] Setting Prompt to:", promptToSet);
        setPrompt(promptToSet);
        setWizardState('RESULTS');
        setActiveTab('ITINERARY');
        setIsEditing(false);

        setBgImage(null); // Reset background image
    };

    const handleSaveChanges = async () => {
        if (!user || !itinerary) return;
        setLoading(true);
        try {
            if (currentTripId) {
                await dbService.updateTrip(user.id, currentTripId, itinerary);
            } else {
                // Manual save = Draft (unless we want to add a 'save as confirmed' option? Assume draft for now)
                const newId = await dbService.saveTrip(user.id, itinerary, 'draft');
                setCurrentTripId(newId);
            }
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to deep update activity
    const updateActivity = (dayIndex: number, activityIndex: number, field: string, value: string) => {
        if (!itinerary) return;
        const newDays = [...itinerary.days];
        const newActivities = [...newDays[dayIndex].activities];
        newActivities[activityIndex] = { ...newActivities[activityIndex], [field]: value };
        newDays[dayIndex].activities = newActivities;
        setItinerary({ ...itinerary, days: newDays });
    };

    const handlePlanTrip = async () => {
        if (!prompt.trim()) return;

        // JOIN SQUAD logic
        if (prompt.toLowerCase().startsWith('join ')) {
            const code = prompt.split(' ')[1];
            if (code && code.length >= 8 && user) {
                setLoading(true);
                try {
                    const tripId = await dbService.joinSquad(user.id, code);
                    if (tripId) {
                        const joinedTrip = await dbService.getTripById(user.id, tripId);
                        if (joinedTrip) {
                            // AUTO-CONFIRM & SHOW SIDEBAR
                            // Force status to 'confirmed' for the joiner so the UI immediately 
                            // activates the Squad Sidebar and real-time features.
                            const authoritativeTrip = { ...joinedTrip, status: 'confirmed' };

                            // Ensure the joined trip is persisted locally so it survives refresh/dashboard
                            dbService.syncJoinedTrip(user.id, authoritativeTrip as any);

                            handleLoadTrip(authoritativeTrip);

                            // Optional: Actually persist the confirmation if not already
                            if (joinedTrip.status !== 'confirmed') {
                                dbService.updateTripStatus(user.id, tripId, 'confirmed').catch(console.error);
                            }

                            setLoading(false);
                            return;
                        }
                    }
                    alert("Failed to join squad. Invalid mission code or trip not found.");
                } catch (err) {
                    console.error("Join Error:", err);
                    alert("Mission interception failed. Re-verify code.");
                } finally {
                    setLoading(false);
                }
                return;
            }
        }

        // SECURITY CHECK: Prevent API Key submission
        // Checks for Google AIza keys and OpenAI sk- keys
        const apiKeyPattern = /(AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{20,})/;
        if (apiKeyPattern.test(prompt)) {
            alert("Security Alert: It looks like you pasted an API Key. Please do not submit API keys in the prompt field. Use the .env file for configuration.");
            return;
        }

        if (!isLoggedIn) {
            setView(AppView.AUTH);
            return;
        }

        if (!user) return;

        // --- CREDIT CHECK ---
        if ((user.credits || 0) < 1) {
            setShowCreditAlert(true); // Use Custom Modal
            return;
        }

        setLoading(true);

        try {
            // STEP 1: ANALYZE PROMPT
            const analysisResult = await analyzeTripRequest(prompt);

            if (analysisResult.isComplete) {
                // Prompt is good, proceed to generation directly
                // Use extracted clean data if available
                const finalPrompt = analysisResult.extractedLocation
                    ? `Trip to ${analysisResult.extractedLocation}. ${analysisResult.extractedDuration ? `Duration: ${analysisResult.extractedDuration}.` : ''} ${prompt}`
                    : prompt;
                await executeGeneration(finalPrompt, analysisResult.extractedLocation);
            } else {
                // Missing info, go to clarification step
                setAnalysis(analysisResult);
                setWizardState('CLARIFYING');
                setLoading(false);
            }

        } catch (e) {
            console.error("Analysis Failed", e);
            // Fallback: Try generating anyway
            await executeGeneration(prompt);
        }
    };

    const handleNextQuestion = (answer: string) => {
        if (!analysis) return;

        const fieldName = analysis.missingFields[currentQuestionIndex];
        // Capitalize first letter for display key (e.g. 'duration' -> 'Duration')
        const displayKey = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

        const updatedSelections = { ...selections, [displayKey]: answer };
        setSelections(updatedSelections);
        setCustomAnswer('');

        if (currentQuestionIndex < analysis.missingFields.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Finished
            handleClarificationSubmit(updatedSelections);
        }
    };

    const handleClarificationSubmit = async (finalSelections: Record<string, string>) => {
        setWizardState('GENERATING');
        setLoading(true);

        // Construct enriched prompt
        let enrichedPrompt = analysis?.extractedLocation
            ? `Trip to ${analysis.extractedLocation}. ${analysis.extractedDuration ? `Duration: ${analysis.extractedDuration}.` : ''} ${prompt}`
            : prompt;

        Object.entries(finalSelections).forEach(([key, value]) => {
            enrichedPrompt += `, ${key}: ${value}`;
        });

        await executeGeneration(enrichedPrompt, analysis?.extractedLocation);
    };

    const executeGeneration = async (finalPrompt: string, extractedDestination?: string) => {
        // 1. Extract destination hint from prompt (for toast display)
        // prioritize extracted destination if available
        let destHint = extractedDestination;
        if (!destHint) {
            const destMatch = finalPrompt.match(/to\s+([A-Za-z\s,]+?)(?:\s+for|\s+in|\s*$)/i);
            destHint = destMatch ? destMatch[1].trim() : finalPrompt.slice(0, 30);
        }

        // 2. Save prompt immediately with 'generating' status
        if (user) {
            const promptId = await dbService.savePromptWithStatus({
                user_id: user.id,
                prompt: finalPrompt,
                destination: destHint,
                status: 'generating'
            });

            // 3. Trigger toast notification
            localStorage.setItem('voyageur_pending_toast', JSON.stringify({
                type: 'generating',
                destination: destHint,
                timestamp: Date.now()
            }));
            if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:toast'));

            // 4. Redirect to Dashboard
            setView(AppView.DASHBOARD);

            // 5. Background Generation
            (async () => {
                let startingCity: string | undefined;
                try {
                    const { getCurrentLocation } = await import('../services/geolocationService');
                    const location = await getCurrentLocation();
                    if (location?.city) {
                        startingCity = location.formatted || location.city;
                    }
                } catch (locErr) {
                    console.warn('Could not get location:', locErr);
                }

                try {
                    let preferences: { dietary?: string; luxury?: number } | undefined;
                    try {
                        const savedSettings = localStorage.getItem('voyageur_settings_v1');
                        if (savedSettings) {
                            const parsed = JSON.parse(savedSettings);
                            preferences = {
                                dietary: parsed.dietary || 'None',
                                luxury: parsed.luxury || 3
                            };
                        }
                    } catch (e) {
                        console.warn('Could not load travel preferences:', e);
                    }

                    let result = await generateItinerary(finalPrompt, startingCity, preferences);
                    result.originalPrompt = finalPrompt;

                    // --- GEOGRAPHIC OPTIMIZATION ---
                    // Use the logistics engine to reorder activities and minimize backtracking
                    try {
                        const { optimizeRouteOrder } = await import('../utils/logisticsEngine');
                        result.days = result.days.map(day => {
                            if (!day.activities || day.activities.length < 3) return day;
                            return { ...day, activities: optimizeRouteOrder(day.activities) };
                        });
                        console.log('[GeoOptimizer] Activities reordered by nearest-neighbor algorithm');
                    } catch (geoErr) {
                        console.warn('[GeoOptimizer] Could not optimize routes:', geoErr);
                    }

                    // --- VALIDATION PROTOCOL ---
                    try {
                        console.log('[Validator] Running validation protocol...');
                        const { validated, fixCount, auditLogs } = await runValidationProtocol(result);
                        result = validated;
                        console.log(`[Validator] Fixed ${fixCount} issues`, auditLogs);
                    } catch (valErr) {
                        console.warn('[Validator] Validation failed, using original result:', valErr);
                    }

                    // --- COST FIX ---
                    try {
                        const parseCost = (str: string | undefined) => {
                            if (!str) return 0;
                            const match = str.match(/[\d,]+/);
                            return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
                        };
                        const parseNights = (dur: string | undefined): number => {
                            if (!dur) return 1;
                            const match = dur.match(/(\d+)/);
                            return match ? Math.max(1, parseInt(match[1]) - 1) : 1;
                        };
                        let bestTravelIdx = 0;
                        let minPrice = Infinity;
                        result.travelOptions?.forEach((opt, idx) => {
                            const p = parseCost(opt.price);
                            if (p > 0 && p < minPrice) { minPrice = p; bestTravelIdx = idx; }
                        });
                        let bestHotelIdx = 0;
                        let maxRating = -1;
                        result.accommodation?.forEach((h, idx) => {
                            const match = h.rating?.match(/[\d.]+/);
                            const r = match ? parseFloat(match[0]) : 0;
                            if (r > maxRating) { maxRating = r; bestHotelIdx = idx; }
                        });
                        const nights = parseNights(result.duration);
                        const travelCost = parseCost(result.travelOptions?.[bestTravelIdx]?.price);
                        const hotelCost = parseCost(result.accommodation?.[bestHotelIdx]?.pricePerNight) * nights;
                        let activityCost = 0;
                        result.days?.forEach(d => d.activities?.forEach(a => activityCost += parseCost(a.estimatedCost)));
                        const total = travelCost + hotelCost + activityCost;
                        if (total > 0) {
                            result.totalEstimatedCost = `₹${total.toLocaleString('en-IN')}`;
                        }
                    } catch (calcErr) {
                        console.warn('[Cost Fix] Failed to recalculate cost', calcErr);
                    }

                    dbService.updatePrompt(user.id, promptId, {
                        status: 'ready',
                        result: result
                    });

                    await dbService.deductCreditsRPC(user.id, 1);
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('voyageur:user-update', {
                            detail: { id: user.id, fullName: user.fullName ?? null }
                        }));
                    }

                    localStorage.setItem('voyageur_pending_toast', JSON.stringify({
                        type: 'success',
                        destination: result.destination,
                        promptId: promptId,
                        timestamp: Date.now()
                    }));
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:toast'));

                } catch (err: any) {
                    console.error('❌ Background generation failed:', err);
                    let userFriendlyError = 'Generation failed. Please try again.';
                    if (err?.message?.includes('429')) userFriendlyError = 'API limit reached. Please wait a moment.';

                    dbService.updatePrompt(user.id, promptId, {
                        status: 'failed',
                        error: userFriendlyError
                    });

                    localStorage.setItem('voyageur_pending_toast', JSON.stringify({
                        type: 'error',
                        destination: destHint,
                        message: userFriendlyError,
                        timestamp: Date.now()
                    }));
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('voyageur:toast'));
                }
            })();
        }
    };

    const handleNewTrip = () => {
        if (clearSelectedTrip) clearSelectedTrip();
        setItinerary(null);
        setPrompt("");
        setWizardState('INPUT');
        setCurrentTripId(null);
        setIsEditing(false);
        setBgImage(null);
        setSelections({});
        setAnalysis(null);
        window.scrollTo(0, 0);
    };

    // Regenerate itinerary based on current travel/hotel selections
    const handleRegenerateItinerary = async () => {
        if (!itinerary || isRegenerating) return;

        setIsRegenerating(true);
        try {
            // Get selected travel option details
            const selectedTravel = selectedTravelIndex !== null && itinerary.travelOptions?.[selectedTravelIndex]
                ? {
                    arrivalTime: itinerary.travelOptions[selectedTravelIndex].arrivalTime,
                    arrivalLocation: itinerary.travelOptions[selectedTravelIndex].arrivalLocation,
                    type: itinerary.travelOptions[selectedTravelIndex].type
                }
                : null;

            // Get selected hotel details
            const selectedHotel = selectedHotelIndex !== null && itinerary.accommodation?.[selectedHotelIndex]
                ? {
                    name: itinerary.accommodation[selectedHotelIndex].name,
                    location: itinerary.accommodation[selectedHotelIndex].location
                }
                : null;

            console.log('🔄 Regenerating itinerary with:', { selectedTravel, selectedHotel });

            const updatedItinerary = await regenerateItineraryDays(itinerary, selectedTravel, selectedHotel);
            setItinerary(updatedItinerary);
            setActiveTab('ITINERARY');
            setActiveDay(0);

            // Save updated itinerary to DB
            if (user && currentTripId) {
                await dbService.updateTrip(user.id, currentTripId, updatedItinerary);
                console.log('✅ Updated itinerary saved');
            }
        } catch (error) {
            console.error('Failed to regenerate itinerary:', error);
            alert('Failed to regenerate itinerary. Please try again.');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleValidateProtocol = async () => {
        if (!itinerary || isValidating) return;
        setIsValidating(true);
        setAuditLog([]);
        try {
            const { validated, fixCount, auditLogs } = await runValidationProtocol(itinerary);
            setItinerary(validated);
            setAuditLog(auditLogs.map(l => ({
                day: l.day,
                title: l.title,
                note: l.note,
                status: l.type === 'FIXED' ? 'corrected' : 'verified'
            })));
            if (user && currentTripId) await dbService.updateTrip(user.id, currentTripId, validated);
        } catch (error: any) {
            console.error("Validation error:", error);
            if (error.message?.includes('429') || error.message?.includes('Quota')) {
                alert("Gemini Fact-Check Quota Reached. Please wait ~10 seconds before re-validating.");
            } else {
                alert("Fact-Check Protocol failed. Ensure your mission parameters are valid and retry.");
            }
        } finally {
            setIsValidating(false);
        }
    };



    // Compute locations for the active day for the map (with geocoding)
    const [dayLocations, setDayLocations] = useState<{ name: string; lat: number; lng: number; type: 'activity' }[]>([]);
    const [isGeocodingLocations, setIsGeocodingLocations] = useState(false);

    useEffect(() => {
        const computeLocations = async () => {
            if (!itinerary?.days?.[activeDay]?.activities) {
                console.log("TripPlanner: No activities found for day", activeDay);
                setDayLocations([]);
                return;
            }

            const activities = itinerary.days[activeDay].activities;
            console.log("TripPlanner: Raw activities for day", activeDay, activities);

            // Separate activities with and without coordinates
            const withCoords: { name: string; lat: number; lng: number; type: 'activity'; index: number }[] = [];
            const needsGeocoding: { title: string; location: string; index: number }[] = [];

            activities.forEach((a, idx) => {
                const lat = a.coordinates?.lat;
                const lng = a.coordinates?.lng || (a.coordinates as any)?.lon;

                if (lat && lng) {
                    withCoords.push({
                        name: a.title,
                        lat,
                        lng,
                        type: 'activity' as const,
                        index: idx
                    });
                } else {
                    // Use location field if available, fallback to title
                    const searchQuery = a.location || a.title;
                    if (searchQuery) {
                        needsGeocoding.push({ title: a.title, location: searchQuery, index: idx });
                    }
                }
            });

            // If no geocoding needed, just use what we have
            if (needsGeocoding.length === 0) {
                console.log("TripPlanner: All activities have coordinates", withCoords);
                setDayLocations(withCoords);
                return;
            }

            // Geocode missing activities using TomTom
            setIsGeocodingLocations(true);
            console.log("TripPlanner: Geocoding", needsGeocoding.length, "activities");

            try {
                const { geocodePlaces } = await import('../services/geocodingService');

                // Add destination context for better geocoding accuracy
                const destination = itinerary.destination || '';
                // Use the location field (more specific) instead of title
                const placesToGeocode = needsGeocoding.map(n =>
                    destination ? `${n.location}, ${destination}` : n.location
                );

                const results = await geocodePlaces(placesToGeocode);

                const geocoded: { name: string; lat: number; lng: number; type: 'activity'; index: number }[] = [];
                needsGeocoding.forEach((item, i) => {
                    const result = results.get(placesToGeocode[i]);
                    if (result) {
                        geocoded.push({
                            name: item.title,
                            lat: result.lat,
                            lng: result.lng,
                            type: 'activity' as const,
                            index: item.index
                        });
                    }
                });

                console.log("TripPlanner: Geocoded", geocoded.length, "activities");

                // --- PERSISTENCE: Save geocoded coordinates back to itinerary ---
                if (geocoded.length > 0 && itinerary && itinerary.days?.[activeDay]) {
                    const updatedItinerary = { ...itinerary };
                    const updatedDays = [...(updatedItinerary.days || [])];
                    const updatedDay = { ...updatedDays[activeDay] };
                    const updatedActivities = [...(updatedDay.activities || [])];

                    geocoded.forEach(g => {
                        const actIdx = g.index;
                        if (updatedActivities[actIdx]) {
                            updatedActivities[actIdx] = {
                                ...updatedActivities[actIdx],
                                coordinates: { lat: g.lat, lng: g.lng }
                            };
                        }
                    });

                    updatedDay.activities = updatedActivities;
                    updatedDays[activeDay] = updatedDay;
                    updatedItinerary.days = updatedDays;

                    // Update local state (this will trigger a re-render but needsGeocoding will be empty)
                    setItinerary(updatedItinerary);

                    // Persist to Supabase if logged in
                    if (isLoggedIn && user?.id && currentTripId) {
                        dbService.updateTrip(user.id, currentTripId, updatedItinerary);
                        console.log("TripPlanner: Persisted geocoded coordinates to Supabase");
                    }
                }

                // Combine ALL locations and sort by original activity order
                const allLocations = [...withCoords, ...geocoded]
                    .sort((a, b) => (a as any).index - (b as any).index)
                    .map(({ index, ...rest }) => rest as { name: string; lat: number; lng: number; type: 'activity' });

                setDayLocations(allLocations);
            } catch (error) {
                console.error("TripPlanner: Geocoding error", error);
                setDayLocations(withCoords); // Fall back to what we have
            } finally {
                setIsGeocodingLocations(false);
            }
        };

        computeLocations();
    }, [itinerary, activeDay, isLoggedIn, user?.id, currentTripId]);

    const handleInputFocus = () => {
        setTimeout(() => {
            textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const handleDateChange = (date: Date | null) => {
        setStartDate(date);
        setDateConflictWarning(null);

        if (!date || !itinerary?.duration) return;

        // Extract duration (e.g. "4 days" -> 4)
        const durationMatch = itinerary.duration.match(/(\d+)/);
        const durationDays = durationMatch ? parseInt(durationMatch[0]) : 1;

        // Calculate proposed end date
        const proposedStart = date.getTime();
        const proposedEnd = proposedStart + (durationDays * 24 * 60 * 60 * 1000);

        // Check for intersection with ANY excluded interval
        const hasConflict = excludedIntervals.some(interval => {
            const blockedStart = interval.start.getTime();
            const blockedEnd = interval.end.getTime();

            // Intersection Formula: (StartA <= EndB) and (EndA >= StartB)
            // We use simple overlap: Start < End && End > Start
            return (proposedStart < blockedEnd) && (proposedEnd > blockedStart);
        });

        if (hasConflict) {
            setDateConflictWarning(`Trip duration (${durationDays} days) overlaps with an existing trip.`);
        }
    };

    // Compute excluded date intervals for react-datepicker
    const excludedIntervals = useMemo(() => {
        const intervals: { start: Date; end: Date }[] = [];
        for (const trip of confirmedTrips) {
            if (trip.id === currentTripId) continue; // Skip self when editing

            const tripStartStr = trip.startDate || trip.data?.startDate;
            if (!tripStartStr) continue;

            const tripDurationMatch = trip.duration?.match(/(\d+)/);
            const tripDuration = tripDurationMatch ? parseInt(tripDurationMatch[0]) : 1;

            const startParts = tripStartStr.split('-');
            const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
            // Subtract 1 day because if I book 4 days starting 1st, I end on 4th (1,2,3,4).
            // So Start + (4-1) days.
            const endDate = new Date(startDate.getTime() + (tripDuration - 1) * 86400000);

            intervals.push({ start: startDate, end: endDate });
        }
        return intervals;
    }, [confirmedTrips, currentTripId]);

    // NEW: Calculate the currently selected trip's full date range for styling
    const tripDates = useMemo(() => {
        if (!startDate || !itinerary?.duration) return new Set<string>();

        const durationMatch = itinerary.duration.match(/(\d+)/);
        const days = durationMatch ? parseInt(durationMatch[0]) : 1;

        const set = new Set<string>();
        const current = new Date(startDate);
        for (let i = 0; i < days; i++) {
            // "YYYY-MM-DD" format for easy comparison
            set.add(current.toDateString());
            current.setDate(current.getDate() + 1);
        }
        return set;
    }, [startDate, itinerary]);

    // NEW PREVIEW: Calculate hover range to show "ghost" selection
    const previewDates = useMemo(() => {
        if (!hoverDate || !itinerary?.duration) return new Map<string, 'valid' | 'invalid'>();

        const durationMatch = itinerary.duration.match(/(\d+)/);
        const days = durationMatch ? parseInt(durationMatch[0]) : 1;

        const map = new Map<string, 'valid' | 'invalid'>();
        const current = new Date(hoverDate);

        // Calculate proposed end for overlap check
        const proposedStart = hoverDate.getTime();
        const proposedEnd = proposedStart + (days * 24 * 60 * 60 * 1000);

        // Check global conflict for this hover position
        const hasConflict = excludedIntervals.some(interval => {
            const blockedStart = interval.start.getTime();
            const blockedEnd = interval.end.getTime();
            return (proposedStart < blockedEnd) && (proposedEnd > blockedStart);
        });

        const status = hasConflict ? 'invalid' : 'valid';

        for (let i = 0; i < days; i++) {
            map.set(current.toDateString(), status);
            current.setDate(current.getDate() + 1);
        }
        return map;
    }, [hoverDate, itinerary, excludedIntervals]);

    const handleBookItinerary = async () => {
        // This is now the FINAL action called by the modal
        setShowConfirmModal(false);
        setBookingStatus('processing');

        try {
            // Format Date to YYYY-MM-DD string using LOCAL date (not UTC to avoid timezone shift)
            const formattedDate = startDate
                ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
                : undefined;

            if (user && itinerary && currentTripId) {
                // EXISTING RECORD (DRAFT, COMPLETED, or CONFIRMED): Update it
                // This prevents duplicates when re-booking or re-confirming
                const updatedItinerary = {
                    ...itinerary,
                    startDate: formattedDate,
                    status: 'confirmed' as const,
                    totalEstimatedCost: formattedCost,
                };

                await dbService.updateTrip(user.id, currentTripId, updatedItinerary);
                await dbService.updateTripStatus(user.id, currentTripId, 'confirmed');

            } else if (user && itinerary) {
                // NEW TRIP (No existing ID)
                const updatedItinerary = {
                    ...itinerary,
                    startDate: formattedDate,
                    status: 'confirmed' as const,
                    totalEstimatedCost: formattedCost,
                    promptId: initialTrip?.promptId
                };

                const newId = await dbService.saveTrip(user.id, updatedItinerary, 'confirmed', undefined, true);
                setCurrentTripId(newId);
            }

            // Update Prompt Log Status (Latch Logic in dbService prevents reversion from 'completed')
            if (isOwner) {
                if (initialTrip?.promptId) {
                    // If we know the specific Prompt ID, update it directly (prevents duplicates)
                    dbService.savePromptWithStatus({
                        id: initialTrip.promptId, // Pass ID to force update
                        user_id: user.id,
                        prompt: itinerary.originalPrompt || prompt, // PREFER preserved text
                        status: 'confirmed',
                        destination: itinerary.destination,
                        allowRegression: true // Allow reverting from 'completed' to 'confirmed'
                    });
                } else if (prompt) {
                    dbService.savePromptWithStatus({
                        user_id: user.id,
                        prompt: itinerary.originalPrompt || prompt, // PREFER preserved text
                        status: 'confirmed',
                        destination: itinerary.destination,
                        allowRegression: true
                    });
                }
            }

            // NOTE: Google Calendar sync is now MANUAL only (via Dashboard button)
        } catch (error) {
            console.error("Failed to confirm trip:", error);
        }

        setTimeout(() => {
            setBookingStatus('confirmed');
            setTimeout(() => {
                setBookingStatus('idle');
                // Redirect to Dashboard (not Wallet) per instructions
                setView(AppView.DASHBOARD);
            }, 2000);
        }, 2000);
    };

    const handleManualSync = async () => {
        if (!itinerary || isSyncing || !user) return;

        setIsSyncing(true);
        try {
            const eventDetails = { ...itinerary };
            // Ensure we have a start date (prefer state, fallback to itinerary prop)
            if (startDate) {
                eventDetails.startDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            }

            // Wrap in StoredTrip structure expected by service
            const mockTrip: any = {
                id: 'manual_sync_temp',
                user_id: user.id,
                destination: eventDetails.destination,
                data: eventDetails,
                status: 'confirmed'
            };

            const result = await googleCalendarService.createEvent(mockTrip);

            if (result.success) {
                alert("Trip added to Google Calendar!");
            } else {
                alert("Failed to add trip: " + (result.error || "Unknown error"));
            }
        } catch (e) {
            console.error(e);
            alert("Sync failed. Check console.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleNodeClick = async (idx: number) => {
        if (expandedNode === idx) {
            setExpandedNode(null);
            setNodeImage(null);
        } else {
            setExpandedNode(idx);
            if (!isMobile) {
                setTimeout(() => {
                    if (nodeRefs.current[idx]) {
                        const yOffset = -150;
                        const element = nodeRefs.current[idx];
                        const y = element!.getBoundingClientRect().top + window.scrollY + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                }, 100);
            }

            // Fetch an image for the newly expanded node
            const activity = itinerary?.days?.[activeDay]?.activities?.[idx];
            if (activity && activity.title) {
                setIsImageLoading(true);
                setNodeImage(null);

                try {
                    const image = await getPlaceImage(activity.title, itinerary.destination);
                    if (image) {
                        setNodeImage(image);
                    }
                } catch (err) {
                    console.error("Failed fetching image for node", err);
                } finally {
                    setIsImageLoading(false);
                }
            }
        }
    };

    const getNodeStyle = (idx: number) => {
        if (expandedNode === null) return 'opacity-100 scale-100 blur-0';
        if (expandedNode === idx) return 'opacity-100 scale-100 z-50 blur-0';
        return 'opacity-60 scale-100 blur-0 transition-all duration-500';
    };

    const activeActivity = expandedNode !== null && itinerary?.days?.[activeDay]?.activities?.[expandedNode]
        ? itinerary.days[activeDay].activities[expandedNode]
        : null;

    // Helper: classify whether an activity is a "logistics" item (meal, hotel, departure) vs a real place to visit
    const isLogisticsActivity = (title: string): boolean => {
        const t = (title || '').toLowerCase();
        const logisticsKeywords = [
            'lunch', 'dinner', 'breakfast', 'brunch', 'snack',
            'check-in', 'check in', 'check-out', 'check out', 'checkin', 'checkout',
            'hotel', 'hostel', 'resort', 'accommodation', 'stay at',
            'depart', 'departure', 'arrival', 'arrive', 'travel to', 'travel from',
            'airport', 'railway station', 'bus station', 'return to',
            'rest at', 'relax at', 'freshen up', 'pack up'
        ];
        return logisticsKeywords.some(kw => t.includes(kw));
    };

    // Pre-process activities: split into "place" nodes (big boxes) and "logistics" items (small inline cards)
    const processedNodes = useMemo(() => {
        const activities = itinerary?.days?.[activeDay]?.activities || [];
        const nodes: { place: any; placeIdx: number; logisticsBefore: any[] }[] = [];
        let pendingLogistics: any[] = [];

        activities.forEach((activity: any, idx: number) => {
            if (isLogisticsActivity(activity.title)) {
                pendingLogistics.push(activity);
            } else {
                nodes.push({
                    place: activity,
                    placeIdx: idx,
                    logisticsBefore: [...pendingLogistics]
                });
                pendingLogistics = [];
            }
        });

        // If there are trailing logistics with no following place, attach them to the last node
        if (pendingLogistics.length > 0 && nodes.length > 0) {
            // Create a virtual "end of day" section
            nodes[nodes.length - 1].logisticsBefore = [
                ...nodes[nodes.length - 1].logisticsBefore,
                ...pendingLogistics
            ];
        } else if (pendingLogistics.length > 0 && nodes.length === 0) {
            // Edge case: ALL activities are logistics (e.g. travel day). Show them as regular nodes.
            pendingLogistics.forEach((activity: any, idx: number) => {
                nodes.push({ place: activity, placeIdx: idx, logisticsBefore: [] });
            });
        }

        return nodes;
    }, [itinerary, activeDay]);

    const pathData = useMemo(() => {
        if (!itinerary?.days?.[activeDay]?.activities) return { path: "", height: 0 };

        const items = itinerary.days[activeDay].activities;
        let currentY = 40;
        const yPositions: number[] = [];

        items.forEach((_: any, i: number) => {
            yPositions.push(currentY);
            const isExpanded = expandedNode === i;
            const isLogistic = isLogisticsActivity(items[i].title);
            const extra = (!isMobile && isExpanded && !isLogistic) ? EXPANDED_EXTRA_HEIGHT : 0;
            // Logistics items get less vertical spacing than places
            const stepHeight = isLogistic ? 120 : BASE_STEP_Y;
            currentY += stepHeight + extra;
        });

        // Add some padding at the bottom
        const totalHeight = currentY + 100;

        let path = "";
        items.forEach((_: any, i: number) => {
            const y = yPositions[i];
            const xPercent = isMobile ? (i % 2 === 0 ? 30 : 70) : (i % 2 === 0 ? 20 : 80);

            if (i === 0) {
                path = `M ${xPercent} ${y} `;
            } else {
                const prevY = yPositions[i - 1];
                const prevXPercent = isMobile ? ((i - 1) % 2 === 0 ? 30 : 70) : ((i - 1) % 2 === 0 ? 20 : 80);

                const dist = y - prevY;
                const cp1y = prevY + (dist / 2);
                const cp2y = y - (dist / 2);

                path += `C ${prevXPercent} ${cp1y}, ${xPercent} ${cp2y}, ${xPercent} ${y} `;
            }
        });
        return { path, height: totalHeight };
    }, [itinerary, activeDay, expandedNode, isMobile, BASE_STEP_Y, EXPANDED_EXTRA_HEIGHT]);

    const handleExport = () => {
        if (!itinerary) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itinerary, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `mission_${cleanDestination(itinerary.destination).replace(/\s+/g, '_')}_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        setConfirmation({
            isOpen: true,
            title: 'Export Complete',
            message: 'Mission brief has been successfully downloaded directly to your device.',
            type: 'success',
            singleAction: true
        });
    };

    const handleSyncCalendar = async () => {
        if (!itinerary) return;

        // TACTICAL TOGGLE: If already synced, handle removal
        if (calendarEventIds.length > 0) {
            setConfirmation({
                isOpen: true,
                title: 'Confirm Removal',
                message: `This will remove ${calendarEventIds.length} events from your Google Calendar. Proceed?`,
                type: 'danger',
                onConfirm: async () => {
                    setConfirmation({ isOpen: false, title: '', message: '' });
                    setIsSyncing(true);
                    setSyncProgress('Clearing...');

                    try {
                        const result = await googleCalendarService.deleteTripEvents(calendarEventIds, (current, total) => {
                            const pct = Math.round((current / total) * 100);
                            setSyncProgress(`${pct}%`);
                        });

                        setIsSyncing(false);
                        setSyncProgress('');

                        if (result.success) {
                            setCalendarEventIds([]);
                            showToast("Mission intelligence successfully redacted from Google Calendar.", 'success');

                            // Persist change to database
                            if (user?.id && currentTripId) {
                                const currentData = initialTrip?.data || {};
                                const updatedData = typeof currentData === 'string'
                                    ? { ...JSON.parse(currentData), calendarEventIds: [] }
                                    : { ...currentData, calendarEventIds: [] };
                                await dbService.updateTrip(user.id, currentTripId, updatedData);
                            }
                        } else {
                            showToast("Extraction failed: " + result.error, 'error');
                        }
                    } catch (e: any) {
                        console.error(e);
                        setIsSyncing(false);
                        setSyncProgress('');
                        showToast("Critical extraction failure.", 'error');
                    }
                }
            });
            return;
        }

        setConfirmation({
            isOpen: true,
            title: 'Confirm Calendar Sync',
            message: 'This will add the entire mission itinerary to your primary Google Calendar. Proceed?',
            type: 'info',
            onConfirm: async () => {
                // Close confirmation and show syncing state
                setConfirmation({ isOpen: false, title: '', message: '' });
                setIsSyncing(true);
                setSyncProgress('0%');

                try {
                    const result = await googleCalendarService.createTripEvent({
                        destination: itinerary.destination,
                        duration: itinerary.duration,
                        startDate: itinerary.startDate || new Date().toISOString(),
                        data: {
                            days: itinerary.days,
                            summary: `Trip to ${itinerary.destination}`
                        }
                    }, (current, total) => {
                        // Update progress as events are created
                        const pct = Math.round((current / total) * 100);
                        setSyncProgress(`${pct}%`);
                    });

                    setIsSyncing(false);
                    setSyncProgress('');

                    if (result.success && result.eventIds) {
                        setCalendarEventIds(result.eventIds);

                        setConfirmation({
                            isOpen: true,
                            title: 'Sync Successful',
                            message: `Mission synced! ${result.eventIds.length} events added to Google Calendar.`,
                            type: 'success',
                            singleAction: true
                        });

                        // Persist change to database
                        if (user?.id && currentTripId) {
                            const currentData = initialTrip?.data || {};
                            const updatedData = typeof currentData === 'string'
                                ? { ...JSON.parse(currentData), calendarEventIds: result.eventIds }
                                : { ...currentData, calendarEventIds: result.eventIds };
                            await dbService.updateTrip(user.id, currentTripId, updatedData);
                        }
                    } else {
                        setConfirmation({
                            isOpen: true,
                            title: 'Sync Failed',
                            message: 'Uplink rejected: ' + result.error,
                            type: 'danger',
                            singleAction: true
                        });
                    }
                } catch (e: any) {
                    console.error(e);
                    setIsSyncing(false);
                    setSyncProgress('');
                    setConfirmation({
                        isOpen: true,
                        title: 'Sync Error',
                        message: 'Critical uplink failure. Check console for telemetry.',
                        type: 'danger',
                        singleAction: true
                    });
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-black relative selection:bg-cyan-500/30">
            <TacticalBackground />

            {loading && <LoadingScreen />}

            {/* WIZARD STATE: INPUT */}
            {wizardState === 'INPUT' && !itinerary && (
                <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center relative z-10">

                    <div className="max-w-4xl w-full animate-fade-in-up">
                        {/* Energized Header */}
                        <div className="text-center mb-16 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-1 bg-cyan-500/20 blur-xl" />
                            <span className="relative inline-block py-1 mb-6 text-xs font-bold tracking-[0.4em] text-cyan-400 uppercase bg-black border border-cyan-500/50 px-6 font-mono shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                                Command Center
                            </span>
                            <h1 className="mb-4 font-sans text-5xl md:text-7xl font-bold tracking-tighter text-white uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                Initialize <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 animate-shimmer bg-[length:200%_100%]">Mission</span>
                            </h1>
                            <p className="max-w-xl mx-auto font-mono text-xs text-zinc-500 tracking-wider uppercase">
                                Neural Logistics Engine :: Standby
                            </p>
                        </div>

                        {/* TACTICAL INPUT HUD */}
                        <div className="relative group max-w-3xl mx-auto">
                            {/* HUD Glow */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/50 to-emerald-500/50 opacity-20 blur-lg group-hover:opacity-40 transition duration-500" />

                            <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 p-1">
                                {/* Corner Decorations */}
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />

                                {/* Header Bar */}
                                <div className="h-10 bg-white/5 flex items-center justify-between px-4 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-cyan-500 animate-pulse" />
                                            <div className="w-1.5 h-1.5 bg-cyan-500/30" />
                                            <div className="w-1.5 h-1.5 bg-cyan-500/30" />
                                        </div>
                                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Input_Stream.sh</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-600">V.2.5.0</div>
                                </div>

                                {/* Text Area */}
                                <div className="relative">
                                    <textarea
                                        ref={textareaRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onFocus={handleInputFocus}
                                        placeholder="ENTER MISSION PARAMETERS..."
                                        className="w-full h-48 bg-transparent text-white text-xl md:text-2xl p-8 focus:outline-none resize-none placeholder-zinc-800 font-mono border-none uppercase leading-relaxed relative z-10"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handlePlanTrip();
                                            }
                                        }}
                                    />
                                    {/* Scanline Effect overlay */}
                                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
                                </div>

                                {/* Footer Bar */}
                                <div className="flex justify-between items-center px-4 md:px-6 py-4 bg-white/5 border-t border-white/5">
                                    <div className="hidden md:flex flex-col">
                                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">System Status</span>
                                        <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest">Optimal</span>
                                    </div>

                                    <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-2 md:gap-3">
                                        {/* Surprise Me Button */}
                                        <button
                                            onClick={() => setWizardState('SURPRISE_ME')}
                                            className="relative group/btn overflow-hidden flex-1 md:flex-none px-4 md:px-6 py-3 bg-black border border-cyan-500/50 text-cyan-400 font-bold uppercase tracking-widest text-xs md:text-sm transition-all hover:bg-cyan-500/10 hover:border-cyan-400 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] flex justify-center"
                                        >
                                            <span className="relative z-10 flex items-center gap-2 font-mono">
                                                <Sparkles className="w-4 h-4" />
                                                <span className="hidden sm:inline">Surprise</span>
                                                <span className="sm:hidden">Auto</span>
                                            </span>
                                            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent group-hover/btn:animate-[shimmer_1s_infinite]" />
                                        </button>

                                        {/* Initiate Button */}
                                        <button
                                            onClick={handlePlanTrip}
                                            disabled={loading || !prompt.trim()}
                                            className="relative group/btn overflow-hidden flex-1 md:flex-none px-4 md:px-10 py-3 bg-cyan-500 text-black font-bold uppercase tracking-widest text-xs md:text-sm transition-all hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed clip-path-slant flex justify-center"
                                        >
                                            <span className="relative z-10 flex items-center gap-2">
                                                Initiate <Zap className="w-4 h-4 fill-black" />
                                            </span>
                                            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover/btn:animate-[shimmer_1s_infinite]" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WIZARD STATE: SURPRISE_ME */}
            {wizardState === 'SURPRISE_ME' && (
                <SurpriseMe
                    onDestinationSelected={(destination, generatedPrompt) => {
                        // Set the prompt and trigger trip planning
                        setPrompt(generatedPrompt);
                        // Small delay to ensure state updates, then trigger planning
                        setTimeout(() => {
                            setWizardState('INPUT');
                            // Auto-trigger the trip planning after a brief moment
                            setTimeout(() => {
                                // The prompt is now set, user can hit Initiate or we auto-start
                                // For now, just go back to INPUT with the prompt filled
                            }, 100);
                        }, 100);
                    }}
                    onCancel={() => setWizardState('INPUT')}
                />
            )}

            {/* WIZARD STATE: CLARIFYING (Sequential) */}
            {wizardState === 'CLARIFYING' && analysis && analysis.missingFields.length > 0 && (
                <div className="min-h-screen pt-20 md:pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-start md:justify-center relative z-10 overflow-y-auto">

                    <div className="max-w-3xl w-full relative z-10 animate-fade-in-up">
                        {(() => {
                            const field = analysis.missingFields[currentQuestionIndex];
                            const isOriginField = field.toLowerCase() === 'origin';

                            const labelMap: Record<string, string> = {
                                duration: "MISSION TIMEFRAME",
                                budget: "RESOURCE ALLOCATION",
                                interests: "OPERATIONAL PARAMETERS",
                                origin: "DEPLOYMENT POINT"
                            };
                            const questionLabel = labelMap[field.toLowerCase()] || `${field.toUpperCase()} REQUIRED`;

                            // Robust lookup: try field as-is, then lowercase, then capitalize first letter
                            const suggestions = analysis.suggestions as any;
                            const options = suggestions[field] ||
                                suggestions[field.toLowerCase()] ||
                                suggestions[field.charAt(0).toUpperCase() + field.slice(1)] ||
                                [];

                            return (
                                <div className="relative">
                                    {/* Background Glow */}
                                    <div className="absolute -inset-1 bg-cyan-500/20 blur-xl opacity-50" />

                                    <div className="relative bg-black/90 border border-cyan-500/30 p-8 md:p-12 shadow-2xl overflow-hidden backdrop-blur-xl">
                                        {/* Tactical Corners */}
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500" />
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500" />

                                        {/* Progress Bar */}
                                        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900/50">
                                            <div
                                                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                                                style={{ width: `${((currentQuestionIndex + 1) / analysis.missingFields.length) * 100}%` }}
                                            />
                                        </div>

                                        {/* Header */}
                                        <div className="text-center mb-10">
                                            <div className="flex justify-center mb-4">
                                                <div className="px-3 py-1 bg-cyan-950/50 border border-cyan-500/30 text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] animate-pulse">
                                                    Input_Required
                                                </div>
                                            </div>
                                            <h2 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-tighter drop-shadow-lg">
                                                {questionLabel}
                                            </h2>
                                        </div>

                                        {/* Quick Options Grid OR Origin Selector */}
                                        {isOriginField ? (
                                            <div className="mb-8">
                                                <OriginSelector onSelect={handleNextQuestion} />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                                {options.map((opt: string) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => handleNextQuestion(opt)}
                                                        className="relative py-6 bg-zinc-900/50 border border-white/10 hover:border-cyan-400 text-zinc-400 hover:text-white font-mono font-bold uppercase tracking-wider transition-all duration-200 group overflow-hidden hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                                                    >
                                                        <span className="relative z-10">{opt}</span>
                                                        {/* Scanning Line on Hover */}
                                                        <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent group-hover:animate-[shimmer_0.5s_infinite]" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Manual Override Input - Hide for Origin since Selector has its own */}
                                        {!isOriginField && (
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 font-mono text-xs tracking-widest">
                                                    &gt;_
                                                </div>
                                                <input
                                                    type="text"
                                                    value={customAnswer}
                                                    onChange={(e) => setCustomAnswer(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && customAnswer.trim()) {
                                                            handleNextQuestion(customAnswer);
                                                        }
                                                    }}
                                                    placeholder="MANUAL OVERRIDE..."
                                                    className="w-full bg-black/50 border border-white/20 py-4 pl-12 pr-16 text-white font-mono text-sm focus:border-cyan-400 focus:bg-black focus:outline-none transition-all uppercase placeholder-zinc-700"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (customAnswer.trim()) handleNextQuestion(customAnswer);
                                                    }}
                                                    disabled={!customAnswer.trim()}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-cyan-400 transition-colors disabled:opacity-30"
                                                >
                                                    <CornerDownRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Step Counter */}
                                        <div className="mt-8 flex justify-between items-end border-t border-white/5 pt-4">
                                            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                                                Sequence {currentQuestionIndex + 1} / {analysis.missingFields.length}
                                            </div>
                                            <div className="flex gap-1">
                                                {analysis.missingFields.map((_, i) => (
                                                    <div key={i} className={`w-1 h-1 rounded-full ${i <= currentQuestionIndex ? 'bg-cyan-400' : 'bg-zinc-800'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* WIZARD STATE: RESULTS (Existing UI) */}
            {(wizardState === 'RESULTS' || wizardState === 'GENERATING') && itinerary && (
                // --- RESULTS STATE (Existing UI mostly, but wrapped) ---
                <div
                    className={`relative w-full pb-32 min-h-screen transition-all duration-700 ease-out will-change-[padding] pt-20 overflow-x-hidden`}
                >

                    {/* Background Image (Fixed, Grayscale) */}
                    {bgImage && (
                        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none grayscale">
                            <img src={bgImage} alt={itinerary.destination} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/80" />
                        </div>
                    )}

                    <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 animate-fade-in-up">
                        {/* HEADER */}
                        {/* HEADER */}
                        {/* --- CINEMATIC HERO SECTION --- */}
                        {/* --- THE GLASS PORTAL HERO SECTION --- */}
                        <div className="relative mb-16 mt-0 px-4">
                            {/* Ambient Backlights - Central Focus */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full mix-blend-screen -z-10 pointer-events-none" />
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full mix-blend-screen -z-10 pointer-events-none animate-pulse" />

                            <div className="max-w-5xl mx-auto relative z-10">
                                {/* The Monolith Container */}
                                <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] md:rounded-[3rem] p-4 md:p-16 shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden group">

                                    {/* Inner Glow */}
                                    <div className="absolute inset-0 rounded-[3rem] border border-white/5 pointer-events-none" style={{ boxShadow: 'inset 0 0 40px rgba(255,255,255,0.02)' }} />

                                    {/* Content Stack */}
                                    <div className="flex flex-col items-center justify-center gap-10 text-center relative z-10">

                                        {/* 1. System Badge (Dining Concierge 'Tactical Box' Style) */}
                                        <div className="relative inline-flex items-center gap-3 py-1 px-3 md:px-6 bg-black border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                                            <span className="relative flex h-2 w-2">
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                            </span>
                                            <span className="text-[10px] sm:text-xs font-bold tracking-widest md:tracking-[0.4em] uppercase text-cyan-400 font-mono">
                                                MISSION ACTIVE <span className="text-zinc-600 mx-2">/</span> {itinerary.id || 'SECURE-ID'}
                                            </span>
                                        </div>

                                        {/* 2. Central Title - Perfectly Centered */}
                                        <div className="w-full flex justify-center items-center">
                                            <div className="max-w-4xl relative">
                                                <ScrambleText
                                                    text={cleanDestination(itinerary.destination)}
                                                    className="block text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-zinc-500 tracking-tighter leading-[0.9] uppercase drop-shadow-2xl text-center"
                                                    speed={40}
                                                />
                                                {/* Subtle reflection overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 mix-blend-overlay pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                        {/* 3. Integrated Stats Row */}
                                        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-16">
                                            {/* Budget */}
                                            <div className="flex flex-col items-center gap-2 group/stat">
                                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400 mb-1 group-hover/stat:bg-emerald-500/10 transition-colors border border-white/5">
                                                    <Wallet className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">Budget</span>
                                                    <span className="text-xl md:text-2xl font-bold text-white tracking-tight tabular-nums">{formattedCost}</span>
                                                </div>
                                            </div>

                                            {/* Duration */}
                                            <div className="flex flex-col items-center gap-2 group/stat">
                                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-orange-400 mb-1 group-hover/stat:bg-orange-500/10 transition-colors border border-white/5">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">Time</span>
                                                    <span className="text-xl md:text-2xl font-bold text-white tracking-tight tabular-nums">{itinerary.duration}</span>
                                                </div>
                                            </div>

                                            {/* Squad */}
                                            <div className="flex flex-col items-center gap-2 group/stat">
                                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-cyan-400 mb-1 group-hover/stat:bg-cyan-500/10 transition-colors border border-white/5">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">Squad</span>
                                                    <span className="text-xl md:text-2xl font-bold text-white tracking-tight tabular-nums">1 Pax</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                                <div className="text-center mt-4">
                                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold opacity-50 mb-2">Ready for Execution</p>

                                    {/* Mission Phase Label - Dynamic based on active tab */}
                                    <div className="font-mono text-xl md:text-2xl font-black tracking-[0.5em] uppercase flex items-center justify-center w-full">
                                        <div className="relative mr-[-0.5em] flex items-center justify-center">
                                            {activeTab === 'TRAVEL' && <span className="text-cyan-400 animate-fade-in">Travel</span>}
                                            {activeTab === 'STAY' && <span className="text-orange-400 animate-fade-in">Stay</span>}
                                            {activeTab === 'ITINERARY' && <span className="text-emerald-400 animate-fade-in">Itinerary</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- FLOATING COMMAND BAR --- */}



                        {/* --- FLOATING COMMAND BAR (PORTAL) --- */}
                        {/* --- FLOATING COMMAND BAR (PORTAL) --- */}
                        {/* --- FLOATING COMMAND BAR REMOVED --- */}
                        {/* New Command Deck Footer implemented below */}
                        {/* CONTENT AREA */}
                        <div>

                            {/* --- TAB 1: INBOUND TRAVEL --- */}
                            {activeTab === 'TRAVEL' && (
                                !itinerary.travelOptions || itinerary.travelOptions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-center bg-black/50 border border-white/10 rounded-xl mt-8">
                                        <Plane className="w-12 h-12 text-zinc-600 mb-4" />
                                        <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">No Travel Data</h3>
                                        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                                            Travel options were not generated for this mission. Try regenerating the itinerary to include flights or alternate transport.
                                        </p>
                                        {itinerary.status !== 'confirmed' && (
                                            <button
                                                onClick={handleRegenerateItinerary}
                                                className="mt-6 px-6 py-3 bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-400 text-white text-xs font-bold uppercase tracking-widest border border-white/20 hover:border-cyan-400 transition-all rounded"
                                            >
                                                Regenerate Options
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Lock indicator for confirmed trips */}
                                        {itinerary.status === 'confirmed' && (
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 p-3 border border-white/5">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                <span>Trip confirmed — travel option locked</span>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 gap-6">
                                            {itinerary.travelOptions?.map((option, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        if (itinerary.status !== 'confirmed') {
                                                            setSelectedTravelIndex(idx);
                                                        }
                                                    }}
                                                    className={`border p-6 transition-all group relative overflow-hidden flex flex-col gap-6 ${itinerary.status === 'confirmed'
                                                        ? 'cursor-not-allowed opacity-60'
                                                        : 'cursor-pointer'
                                                        } ${selectedTravelIndex === idx
                                                            ? 'bg-cyan-900/10 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                                                            : 'bg-black/80 backdrop-blur-sm border-white/10 hover:border-cyan-400/50'
                                                        }`}
                                                >
                                                    {/* Header Row: Icon + Type + Cost */}
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-3 bg-white/5 border border-white/10 text-cyan-400 group-hover:bg-cyan-400 group-hover:text-black transition-colors ${selectedTravelIndex === idx ? 'bg-cyan-400 text-black' : ''}`}>
                                                                {option.type === 'FLIGHT' ? <Plane className="w-5 h-5" /> :
                                                                    option.type === 'TRAIN' ? <Train className="w-5 h-5" /> :
                                                                        option.type === 'BUS' ? <Bus className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-0.5">{option.type}</div>
                                                                <div className="font-bold text-white uppercase">{option.provider}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-emerald-400 border border-emerald-400/20 px-2 py-1 bg-emerald-400/10">{option.price}</span>
                                                    </div>

                                                    {/* Timeline Row */}
                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-sm">
                                                        <div>
                                                            <div className="text-white text-lg">{option.departureTime}</div>
                                                            <div className="text-[10px] text-zinc-500 uppercase truncate max-w-[120px]" title={option.departureLocation}>{option.departureLocation}</div>
                                                        </div>

                                                        <div className="flex-1 flex flex-col items-center px-2">
                                                            <div className="text-[10px] text-zinc-500 mb-1">{option.duration}</div>
                                                            <div className="w-full h-px bg-zinc-700 relative flex items-center">
                                                                <div className="w-1 h-1 bg-cyan-400 absolute left-0" />
                                                                <ArrowRight className="w-3 h-3 text-cyan-400 absolute right-0 -mr-1" />
                                                            </div>
                                                            <div className="text-[10px] text-cyan-400 mt-1 uppercase">Direct</div>
                                                        </div>

                                                        <div className="text-right">
                                                            <div className="text-white text-lg">{option.arrivalTime}</div>
                                                            <div className="text-[10px] text-zinc-500 uppercase truncate max-w-[120px]" title={option.arrivalLocation}>{option.arrivalLocation}</div>
                                                        </div>
                                                    </div>

                                                    {/* Selection Indicator */}
                                                    <div className={`absolute top-4 right-4 transition-opacity ${selectedTravelIndex === idx ? 'opacity-100' : 'opacity-0'}`}>
                                                        <CheckCircle className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                                                    </div>

                                                    {/* View Route Button - Shows route from current location to departure station */}
                                                    <a
                                                        href={`https://www.google.com/maps/dir/?api=1&origin=current+location&destination=${encodeURIComponent(cleanDestination(option.departureLocation))}&travelmode=driving`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mt-4 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all"
                                                    >
                                                        <Navigation className="w-3 h-3" />
                                                        Get to {option.type === 'FLIGHT' ? 'Airport' : option.type === 'TRAIN' ? 'Station' : 'Pickup'}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}

                            {/* --- TAB 2: ACCOMMODATION --- */}
                            {activeTab === 'STAY' && (
                                !itinerary.accommodation || itinerary.accommodation.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-center bg-black/50 border border-white/10 rounded-xl mt-8">
                                        <Bed className="w-12 h-12 text-zinc-600 mb-4" />
                                        <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">No Stay Data</h3>
                                        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                                            Accommodation options were not generated for this mission. Try regenerating the itinerary to include hotels.
                                        </p>
                                        {itinerary.status !== 'confirmed' && (
                                            <button
                                                onClick={handleRegenerateItinerary}
                                                className="mt-6 px-6 py-3 bg-white/5 hover:bg-orange-500/10 hover:text-orange-400 text-white text-xs font-bold uppercase tracking-widest border border-white/20 hover:border-orange-400 transition-all rounded"
                                            >
                                                Regenerate Options
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Lock indicator for confirmed trips */}
                                        {itinerary.status === 'confirmed' && (
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 p-3 border border-white/5">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                <span>Trip confirmed — accommodation locked</span>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {itinerary.accommodation?.map((hotel, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        if (itinerary.status !== 'confirmed') {
                                                            setSelectedHotelIndex(idx);
                                                        }
                                                    }}
                                                    className={`group transition-all border relative bg-black/90 backdrop-blur-sm ${itinerary.status === 'confirmed'
                                                        ? 'cursor-not-allowed opacity-60'
                                                        : 'cursor-pointer'
                                                        } ${selectedHotelIndex === idx
                                                            ? 'border-orange-400 ring-1 ring-orange-400 shadow-[0_0_30px_rgba(251,146,60,0.2)]'
                                                            : 'border-white/10 hover:border-orange-400/40'
                                                        }`}
                                                >
                                                    <div className="h-64 relative overflow-hidden">
                                                        <img
                                                            src={HOTEL_IMAGES[idx % HOTEL_IMAGES.length]}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                            alt={hotel.name}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80';
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                                                        {selectedHotelIndex === idx && (
                                                            <div className="absolute top-4 left-4">
                                                                <div className="bg-orange-400 text-black px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                                                    <CheckCircle className="w-3.5 h-3.5 fill-black" /> Selected
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-2.5 py-1 text-xs font-bold text-white flex items-center gap-1 border border-white/20">
                                                            <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {hotel.rating}
                                                        </div>

                                                        <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 sm:gap-0">
                                                            <div>
                                                                <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">{hotel.name}</h3>
                                                                <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-mono">
                                                                    <MapPin className="w-3 h-3 text-orange-400" /> {hotel.location}
                                                                </div>
                                                            </div>
                                                            <div className="text-xl font-bold text-white bg-black/80 px-3 py-1 border border-white/20">{hotel.pricePerNight}</div>
                                                        </div>
                                                    </div>

                                                    <div className="p-6 flex flex-col h-[calc(100%-16rem)]">
                                                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed line-clamp-3 font-sans">
                                                            {hotel.description}
                                                        </p>
                                                        <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap gap-2">
                                                            {hotel.amenities.slice(0, 3).map((amenity, i) => (
                                                                <span key={i} className="text-[10px] bg-white/5 px-2.5 py-1 text-zinc-300 border border-white/10 uppercase tracking-wide font-mono">{amenity}</span>
                                                            ))}
                                                            {hotel.amenities.length > 3 && <span className="text-[10px] bg-white/5 px-2.5 py-1 text-zinc-300 border border-white/10 uppercase tracking-wide font-mono">+{hotel.amenities.length - 3}</span>}
                                                        </div>
                                                        {/* View on Map Button */}
                                                        <a
                                                            href={getPlaceLink(hotel.name, cleanDestination(itinerary.destination))}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="mt-4 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400 transition-all"
                                                        >
                                                            <MapPin className="w-3 h-3" />
                                                            View on Map
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}

                            {/* --- TAB 3: ITINERARY --- */}
                            {activeTab === 'ITINERARY' && (
                                <div>
                                    {/* DAY TABS */}
                                    {/* DAY TABS (Refactored to Time Stream) */}
                                    {/* DAY TABS (Restored Box Layout) */}
                                    <div
                                        className="sticky top-0 bg-black/95 backdrop-blur-xl z-[60] border border-white/10 mb-12 shadow-2xl transition-all relative group/tabs rounded-xl mx-auto"
                                    >
                                        <div className="absolute top-0 bottom-0 left-0 w-8 md:w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
                                        <div className="absolute top-0 bottom-0 right-0 w-8 md:w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

                                        {/* SCROLL BUTTON: LEFT */}
                                        <button
                                            onClick={() => dayScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                                            className="absolute left-0 top-0 bottom-0 w-12 z-20 hidden md:flex items-center justify-center bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/tabs:opacity-100 transition-opacity"
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>

                                        {/* SCROLL BUTTON: RIGHT */}
                                        <button
                                            onClick={() => dayScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                                            className="absolute right-0 top-0 bottom-0 w-12 z-20 hidden md:flex items-center justify-center bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/tabs:opacity-100 transition-opacity"
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </button>


                                        <div
                                            ref={dayScrollRef}
                                            className="flex overflow-x-auto hide-scrollbar gap-3 justify-start px-4 md:px-20 py-8 relative z-0 items-center h-[120px] cursor-grab active:cursor-grabbing select-none"
                                            onMouseDown={(e) => {
                                                isDragging.current = true;
                                                startX.current = e.pageX - (dayScrollRef.current?.offsetLeft || 0);
                                                scrollLeft.current = dayScrollRef.current?.scrollLeft || 0;
                                            }}
                                            onMouseLeave={() => { isDragging.current = false; }}
                                            onMouseUp={() => { isDragging.current = false; }}
                                            onMouseMove={(e) => {
                                                if (!isDragging.current) return;
                                                e.preventDefault();
                                                const x = e.pageX - (dayScrollRef.current?.offsetLeft || 0);
                                                const walk = (x - startX.current) * 2;
                                                if (dayScrollRef.current) {
                                                    dayScrollRef.current.scrollLeft = scrollLeft.current - walk;
                                                }
                                            }}
                                        >
                                            {itinerary.days?.map((day, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setActiveDay(idx);
                                                        setExpandedNode(null);
                                                    }}
                                                    className={`group/btn relative flex-shrink-0 w-[100px] h-[70px] flex flex-col items-center justify-center rounded-xl border transition-all duration-300 ease-out ${activeDay === idx
                                                        ? 'border-cyan-400/50 bg-gradient-to-br from-cyan-950/80 to-black text-white shadow-[0_0_30px_-5px_rgba(34,211,238,0.4)] scale-110'
                                                        : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/20 hover:text-white hover:-translate-y-1 hover:shadow-lg'
                                                        }`}
                                                >
                                                    {/* GLOW EFFECT ON HOVER */}
                                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                                    <span className="text-[10px] font-bold uppercase tracking-widest mb-1 font-mono z-10">Day {idx + 1}</span>
                                                    <span className="font-bold text-lg font-sans z-10">{day.day?.split(' ')[0] || (idx + 1)}</span>
                                                </button>
                                            ))}
                                            <div className="w-8 flex-shrink-0" />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {itinerary.status !== 'confirmed' && (
                                        <div className="mb-6 flex flex-wrap justify-end gap-3">
                                            {auditLog.length > 0 && (
                                                <button
                                                    onClick={() => setShowAuditModal(true)}
                                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-white/20 text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
                                                >
                                                    <Terminal className="w-3 h-3" /> View Logs
                                                </button>
                                            )}
                                            <button
                                                onClick={handleValidateProtocol}
                                                disabled={isValidating || isRegenerating}
                                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all disabled:opacity-50"
                                            >
                                                <ShieldCheck className={`w-3 h-3 ${isValidating ? 'animate-pulse text-emerald-400' : ''}`} />
                                                {isValidating ? 'Validating...' : 'Validate Protocol'}
                                            </button>
                                            <button
                                                onClick={handleRegenerateItinerary}
                                                disabled={isRegenerating || isValidating}
                                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400 transition-all disabled:opacity-50"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                                                {isRegenerating ? 'Optimizing...' : 'Optimize for Selections'}
                                            </button>
                                        </div>
                                    )}

                                    {/* ITINERARY TIMELINE CONTAINER */}
                                    <div className="relative min-h-[800px] w-full max-w-3xl mx-auto py-6 md:py-12 px-4 mt-32 md:mt-0">

                                        {expandedNode !== null && (
                                            <div
                                                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] cursor-pointer"
                                                onClick={() => setExpandedNode(null)}
                                            />
                                        )}

                                        <svg
                                            className={`absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible transition-opacity duration-500 ${expandedNode !== null ? 'opacity-60' : 'opacity-100'}`}
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox={`0 0 100 ${pathData.height}`}
                                            preserveAspectRatio="none"
                                        >
                                            <defs>
                                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" stopColor="#22d3ee" />
                                                    <stop offset="100%" stopColor="#fb923c" />
                                                </linearGradient>
                                            </defs>
                                            <path
                                                d={pathData.path}
                                                fill="none"
                                                stroke="url(#lineGradient)"
                                                strokeWidth="2"
                                                vectorEffect="non-scaling-stroke"
                                                strokeLinecap="square"
                                                className="transition-all duration-500 opacity-60"
                                            />
                                        </svg>

                                        {/* NODES */}
                                        <div className="relative">
                                            {itinerary.days?.[activeDay]?.activities?.map((activity: any, idx: number) => {
                                                const isEven = idx % 2 === 0;
                                                const isExpanded = expandedNode === idx;
                                                const isLogistic = isLogisticsActivity(activity.title);

                                                return (
                                                    <div
                                                        key={idx}
                                                        ref={(el) => { nodeRefs.current[idx] = el; }}
                                                        className={`flex relative ${isEven ? 'justify-start' : 'justify-end'} transition-all duration-500 ease-out ${getNodeStyle(idx)}`} style={{
                                                            marginBottom: isLogistic ? '80px' : ((!isMobile && isExpanded) ? `${EXPANDED_EXTRA_HEIGHT + 60}px` : '160px'),
                                                            paddingLeft: isMobile ? (isEven ? '10%' : '0') : (isEven ? '20%' : '0'),
                                                            paddingRight: isMobile ? (!isEven ? '10%' : '0') : (!isEven ? '20%' : '0'),
                                                        }}
                                                    >
                                                        <div className="relative group flex flex-col items-center">
                                                            {/* NODE BUTTON - Big square for places, small square for logistics */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!isLogistic) handleNodeClick(idx);
                                                                }}
                                                                className={`relative border flex items-center justify-center transition-all duration-300 z-20 ${isLogistic
                                                                    ? 'w-12 h-12 bg-zinc-900 border-white/10 text-zinc-400 hover:border-orange-400/50 hover:text-orange-400 cursor-default'
                                                                    : isExpanded
                                                                        ? 'w-20 h-20 bg-white border-white text-black scale-110 shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                                                                        : 'w-20 h-20 bg-black border-white/20 text-white hover:border-cyan-400 hover:text-cyan-400 hover:scale-110'
                                                                    }`}
                                                                title={isLogistic ? activity.title : undefined}
                                                            >
                                                                {!isLogistic && activity.isValidated && (
                                                                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-black p-0.5 rounded-full z-30">
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                                {isLogistic ? (
                                                                    (activity.title || '').toLowerCase().includes('lunch') || (activity.title || '').toLowerCase().includes('dinner') || (activity.title || '').toLowerCase().includes('breakfast') || (activity.title || '').toLowerCase().includes('brunch')
                                                                        ? <Utensils className="w-5 h-5" />
                                                                        : (activity.title || '').toLowerCase().includes('hotel') || (activity.title || '').toLowerCase().includes('check') || (activity.title || '').toLowerCase().includes('resort')
                                                                            ? <MapPin className="w-5 h-5" />
                                                                            : <ArrowRight className="w-5 h-5" />
                                                                ) : (
                                                                    idx === 0 ? <Camera className="w-8 h-8" /> :
                                                                        (activity.title || '').toLowerCase().includes('temple') || (activity.title || '').toLowerCase().includes('church') || (activity.title || '').toLowerCase().includes('mosque') ? <MapPin className="w-8 h-8" /> :
                                                                            (activity.title || '').toLowerCase().includes('concert') || (activity.title || '').toLowerCase().includes('show') ? <Music className="w-8 h-8" /> :
                                                                                (activity.title || '').toLowerCase().includes('beach') || (activity.title || '').toLowerCase().includes('lake') ? <Camera className="w-8 h-8" /> :
                                                                                    <MapPin className="w-8 h-8" />
                                                                )}
                                                            </button>

                                                            {/* TIME LABEL */}
                                                            <div className={`absolute ${isLogistic ? '-top-7' : '-top-10'} left-1/2 -translate-x-1/2 bg-black px-3 py-1.5 border border-white/20 ${isLogistic ? 'text-[10px]' : 'text-sm'} font-mono text-white whitespace-nowrap z-10 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-80'}`}>
                                                                {activity.time}
                                                            </div>

                                                            {/* TITLE LABEL - Show below the node (smaller for logistics) */}
                                                            {!isExpanded && (
                                                                <div className={`absolute ${isLogistic ? '-bottom-7' : '-bottom-10'} left-1/2 -translate-x-1/2 whitespace-nowrap`}>
                                                                    <span className={`${isLogistic ? 'text-[10px] text-zinc-500 font-medium' : 'text-sm font-bold text-white'} bg-black px-3 py-1 border border-white/10 uppercase tracking-tight`}>
                                                                        {activity.title}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* TRANSIT LOGISTICS BADGE (Above the Node) */}
                                                            {idx > 0 && activity.transitFromPrev && !isLogistic && (
                                                                <div
                                                                    className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto cursor-help group/transit z-30"
                                                                    style={{ top: `-80px` }}
                                                                >
                                                                    <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/20 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:bg-zinc-900 transition-colors">
                                                                        {activity.transitFromPrev.mode.toLowerCase().includes('walk') ? <Footprints className="w-3.5 h-3.5 text-cyan-400" /> :
                                                                            activity.transitFromPrev.mode.toLowerCase().includes('drive') || activity.transitFromPrev.mode.toLowerCase().includes('car') ? <Car className="w-3.5 h-3.5 text-cyan-400" /> :
                                                                                activity.transitFromPrev.mode.toLowerCase().includes('train') ? <Train className="w-3.5 h-3.5 text-cyan-400" /> :
                                                                                    activity.transitFromPrev.mode.toLowerCase().includes('bus') ? <Bus className="w-3.5 h-3.5 text-cyan-400" /> :
                                                                                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />}
                                                                        <span className="font-mono text-[10px] text-zinc-300 whitespace-nowrap">{activity.transitFromPrev.duration}</span>
                                                                    </div>

                                                                    {/* Tooltip for Instruction */}
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[300px] bg-zinc-950 text-zinc-300 text-[11px] leading-relaxed px-4 py-3 border border-white/10 opacity-0 group-hover/transit:opacity-100 transition-opacity pointer-events-none text-center shadow-xl rounded-md">
                                                                        {activity.transitFromPrev.instruction}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* DESKTOP CARD - Only for place nodes, not logistics */}
                                                            {!isMobile && isExpanded && !isLogistic && (
                                                                <div
                                                                    className={`
                                                                z-[100] animate-fade-in-up origin-top absolute top-[100%] mt-6 w-[400px] ${isEven ? 'left-0 md:left-full md:ml-8' : 'right-0 md:right-full md:mr-8'}
                                                            `}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="bg-black border border-white/20 p-6 shadow-2xl relative overflow-hidden overflow-y-auto max-h-[500px] hover:overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">

                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setExpandedNode(null);
                                                                            }}
                                                                            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 z-50 rounded-full"
                                                                        >
                                                                            <X className="w-4 h-4 text-white" />
                                                                        </button>

                                                                        <div className="flex justify-between items-start mb-2 pr-8 relative z-10">
                                                                            {isEditing ? (
                                                                                <input
                                                                                    value={activity.title}
                                                                                    onChange={(e) => updateActivity(activeDay, idx, 'title', e.target.value)}
                                                                                    className="bg-white/10 border border-white/20 text-white text-xl font-bold uppercase w-full p-2 focus:border-cyan-400 focus:outline-none"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full">
                                                                                    {/* Image Header Block */}
                                                                                    {nodeImage?.imageUrl && (
                                                                                        <div className="w-[calc(100%+48px)] -mx-6 -mt-6 mb-6 h-40 relative overflow-hidden group/img">
                                                                                            <img
                                                                                                src={nodeImage.imageUrl}
                                                                                                alt={activity.title}
                                                                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110"
                                                                                            />
                                                                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
                                                                                            <a
                                                                                                href={nodeImage.photographerUrl}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                onClick={e => e.stopPropagation()}
                                                                                                className="absolute bottom-2 right-4 text-[9px] text-white/50 hover:text-white transition-colors z-20"
                                                                                            >
                                                                                                Photo by {nodeImage.photographer} on Unsplash
                                                                                            </a>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="font-bold text-white text-xl leading-tight uppercase flex items-center gap-3">
                                                                                        {activity.title}
                                                                                        {isImageLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {isEditing ? (
                                                                            <input
                                                                                value={activity.estimatedCost}
                                                                                onChange={(e) => updateActivity(activeDay, idx, 'estimatedCost', e.target.value)}
                                                                                className="bg-white/10 border border-white/20 text-white text-xs font-bold uppercase w-1/3 p-1 mb-3 focus:border-cyan-400 focus:outline-none"
                                                                            />
                                                                        ) : (
                                                                            <span className="inline-block text-xs bg-white text-black px-2 py-1 mb-3 font-bold border border-white">
                                                                                {activity.estimatedCost}
                                                                            </span>
                                                                        )}

                                                                        {isEditing ? (
                                                                            <textarea
                                                                                value={activity.description}
                                                                                onChange={(e) => updateActivity(activeDay, idx, 'description', e.target.value)}
                                                                                className="w-full h-32 bg-white/5 border border-white/20 text-sm text-zinc-300 p-3 mb-6 focus:border-cyan-400 focus:outline-none resize-none"
                                                                            />
                                                                        ) : (
                                                                            <>
                                                                                <p className="text-sm text-zinc-300 mb-6 leading-relaxed border-l-2 border-cyan-500/30 pl-3">
                                                                                    {activity.description}
                                                                                </p>
                                                                                {activity.isValidated && activity.verificationNote && (
                                                                                    <div className="flex items-center gap-2 mb-6 text-emerald-400 text-[10px]">
                                                                                        <ShieldCheck className="w-3 h-3" /> {activity.verificationNote}
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}

                                                                        {activity.transitFromPrev && (
                                                                            <div className="bg-white/5 p-4 text-xs text-zinc-300 flex items-start gap-3 mb-4 border border-white/10">
                                                                                <div className="p-2 bg-black border border-cyan-500/30 text-cyan-400 mt-1">
                                                                                    <Footprints className="w-4 h-4" />
                                                                                </div>
                                                                                <div>
                                                                                    <div className="font-bold uppercase text-[10px] text-zinc-500 mb-1 tracking-wider">Logistics</div>
                                                                                    <div className="font-bold text-white mb-0.5">
                                                                                        {activity.transitFromPrev.mode} • {activity.transitFromPrev.duration}
                                                                                    </div>
                                                                                    <div className="opacity-80">{activity.transitFromPrev.instruction}</div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* View on Map button - Show only for specific pinpointable locations */}
                                                                        {shouldShowMapButton(activity) && (
                                                                            <div className="mt-auto space-y-2">
                                                                                <div className="flex gap-3">
                                                                                    <a
                                                                                        href={getPlaceLink(activity.location || activity.title, itinerary.destination)}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="flex-1 py-3 bg-transparent border border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-400 text-emerald-400 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                                                                    >
                                                                                        <MapPin className="w-4 h-4" /> View on Map
                                                                                    </a>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className={`absolute top-[0%] left-1/2 -translate-x-1/2 md:left-[20%] -translate-y-[80px] transition-opacity ${expandedNode !== null ? 'opacity-20' : 'opacity-100'}`}>
                                            <div className="text-xs font-bold uppercase text-zinc-500 tracking-widest bg-black px-2 py-1 border border-white/10">Start</div>
                                        </div>

                                    </div>
                                </div>
                            )}


                            {/* GLOBAL BOOKING BAR - REMOVED: INTEGRATED INTO FOOTER BELOW */}
                        </div>


                        {/* MOBILE MODAL CARD */}
                        {isMobile && activeActivity && typeof document !== 'undefined' && createPortal(
                            <div
                                className="fixed inset-0 z-[1200] flex items-end justify-center p-4 pb-24 animate-fade-in"
                                onClick={() => setExpandedNode(null)}
                            >
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                                <div
                                    className="relative w-[90%] max-w-[380px] bg-zinc-950 border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] max-h-[70vh] rounded-2xl animate-[fadeInUp_0.3s_ease-out] flex flex-col overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedNode(null);
                                        }}
                                        className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 z-50 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                    {/* SIDEBAR MAP DRAWER (End) */}

                                    {/* SCROLLABLE CONTENT */}
                                    <div className="flex-1 overflow-y-auto p-6 min-h-0">
                                        <div className="flex justify-between items-start mb-2 pr-8 relative z-10 mt-1">
                                            <h4 className="font-bold text-white text-xl leading-tight uppercase tracking-tight">{activeActivity.title}</h4>
                                        </div>

                                        <div className="flex items-center gap-2 mb-5">
                                            <span className="inline-block text-[10px] bg-white text-black px-2 py-0.5 font-bold border border-white tracking-wide">
                                                {activeActivity.estimatedCost}
                                            </span>
                                            <span className="text-xs text-zinc-400 font-mono">
                                                {activeActivity.time}
                                            </span>
                                        </div>

                                        <p className="text-sm text-zinc-300 mb-6 leading-relaxed border-l-2 border-white/20 pl-4">
                                            {activeActivity.description}
                                        </p>

                                        {activeActivity.isValidated && activeActivity.verificationNote && (
                                            <div className="flex items-center gap-2 mb-5 text-emerald-400 text-xs bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                                                <span>{activeActivity.verificationNote}</span>
                                            </div>
                                        )}

                                        {activeActivity.transitFromPrev && (
                                            <div className="bg-white/5 p-4 text-xs text-zinc-300 flex items-start gap-3 mb-5 border border-white/10 rounded-lg">
                                                <div className="p-1.5 bg-black border border-cyan-400/30 text-cyan-400 mt-0.5 rounded">
                                                    <Footprints className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-bold uppercase text-[10px] text-zinc-500 mb-1 tracking-wider">Logistics</div>
                                                    <div className="font-bold text-white mb-0.5 text-sm">
                                                        {activeActivity.transitFromPrev.mode} • {activeActivity.transitFromPrev.duration}
                                                    </div>
                                                    <div className="opacity-80 leading-snug">{activeActivity.transitFromPrev.instruction}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* STICKY FOOTER */}
                                    <div className="p-4 border-t border-white/10 bg-zinc-950/50 backdrop-blur-sm mt-auto">
                                        <div className="flex gap-3">
                                            {shouldShowMapButton(activeActivity) && (
                                                <a
                                                    href={getPlaceLink(activeActivity.location || activeActivity.title, itinerary.destination)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-1 py-3.5 bg-white text-black text-xs font-bold uppercase tracking-wider transition-colors hover:bg-cyan-400 flex items-center justify-center gap-2 rounded-lg"
                                                >
                                                    <MapPin className="w-4 h-4" /> View on Map
                                                </a>
                                            )}
                                            {activeActivity.bookingRequired && (
                                                <button className="px-5 py-3.5 bg-transparent border border-white/20 hover:bg-white hover:text-black text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg">
                                                    <Ticket className="w-4 h-4" /> Book
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>
                </div>
            )
            }


            {/* ADMIN SETTINGS MODAL */}
            {
                itinerary && currentTripId && (
                    <AdminSettingsModal
                        isOpen={showSettings}
                        onClose={() => setShowSettings(false)}
                        tripId={currentTripId}
                        tripName={itinerary.destination}
                        tripData={itinerary}
                        members={members}
                        ownerId={(tripOwnerId && tripOwnerId !== 'null') ? tripOwnerId : (user?.id || '')}
                        onUpdateTrip={async (updates: any) => {
                            // Optimistically update local state if needed, but dbService handles it via onUpdateTrip
                            await dbService.updateTrip(user?.id || '', currentTripId, { ...itinerary, ...updates });
                        }}
                        onDeleteTrip={async () => {
                            console.log('Delete trip');
                            await supabase.from('trips').delete().eq('id', currentTripId);
                            onBackToLogs && onBackToLogs();
                        }}
                        onKickMember={async (userId) => {
                            const success = await dbService.kickMember(currentTripId, userId);
                            if (!success) throw new Error('Kick failed. Check database permissions.');
                        }}
                        onPromoteMember={async (userId, newRole) => {
                            const success = await dbService.promoteMember(currentTripId, userId, newRole);
                            if (!success) throw new Error('Promote failed. Check database permissions.');
                        }}
                        weather={weather}
                    />
                )
            }

            {/* COMMAND DECK (FOOTER) - REPLACES FLOATING NAV */}
            {
                wizardState === 'RESULTS' && itinerary && (
                    <div className="fixed bottom-0 left-0 right-0 z-[1100] bg-black/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] animate-slide-up-fade">
                        {/* Decorative Top Line */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">

                            {/* LEFT: MAIN MODULES (Tabs) */}
                            <div className="flex items-center gap-1 md:gap-2">
                                <button
                                    onClick={() => { setActiveTab('ITINERARY'); setIsMapOpen(false); }}
                                    className={`flex flex-col items-center justify-center w-16 md:w-20 h-16 rounded border ${activeTab === 'ITINERARY' && !isMapOpen ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-white hover:bg-white/5'} transition-all group`}
                                >
                                    <Clock className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Timeline</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('ITINERARY'); setIsMapOpen(true); }}
                                    className={`flex flex-col items-center justify-center w-16 md:w-20 h-16 rounded border ${isMapOpen ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-white hover:bg-white/5'} transition-all group`}
                                >
                                    <MapIcon className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Intel Map</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('STAY'); setIsMapOpen(false); }}
                                    className={`flex flex-col items-center justify-center w-16 md:w-20 h-16 rounded border ${activeTab === 'STAY' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-white hover:bg-white/5'} transition-all group`}
                                >
                                    <Bed className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Stay</span>
                                </button>
                                <button
                                    onClick={() => { setActiveTab('TRAVEL'); setIsMapOpen(false); }}
                                    className={`flex flex-col items-center justify-center w-16 md:w-20 h-16 rounded border ${activeTab === 'TRAVEL' ? 'bg-violet-500/10 border-violet-500/50 text-violet-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-white hover:bg-white/5'} transition-all group`}
                                >
                                    <Plane className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Travel</span>
                                </button>
                            </div>

                            {/* CENTER: TACTICAL ACTIONS */}
                            <div className="hidden md:flex items-center gap-3 px-6 border-x border-white/5 bg-white/[0.02] h-full">
                                <button onClick={handleExport} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors p-2" title="Export Mission Brief">
                                    <FileDown className="w-4 h-4" />
                                    <span className="text-[8px] font-mono uppercase">Export</span>
                                </button>
                                <button
                                    onClick={handleSyncCalendar}
                                    disabled={isSyncing}
                                    className={`flex flex-col items-center gap-1 transition-all p-2 relative ${isSyncing ? 'text-cyan-400' :
                                        (calendarEventIds.length > 0 ? 'text-red-500 hover:text-red-400' : 'text-zinc-500 hover:text-white')
                                        }`}
                                    title={calendarEventIds.length > 0 ? "Remove from Calendar" : "Sync Comms"}
                                >
                                    {isSyncing ? (
                                        <div className="relative">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {syncProgress && (
                                                <span className="absolute -top-3 -right-6 text-[7px] font-black bg-cyan-500 text-black px-1 rounded animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                                                    {syncProgress}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        calendarEventIds.length > 0 ? <X className="w-4 h-4" /> : <Calendar className="w-4 h-4" />
                                    )}
                                    <span className="text-[8px] font-mono uppercase tracking-tighter">
                                        {isSyncing ? 'Syncing' : (calendarEventIds.length > 0 ? 'Remove' : 'Sync')}
                                    </span>
                                </button>
                                <div className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors p-2 cursor-help" title="Local Atmosphere">
                                    <CloudRain className="w-4 h-4" />
                                    <span className="text-[8px] font-mono uppercase">
                                        {weather ? `${weather.temperature}°C` : 'Weather'}
                                    </span>
                                </div>
                                <div className="w-px h-8 bg-white/10 mx-2" />
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`flex flex-col items-center gap-1 transition-colors p-2 ${isEditing ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
                                    title={isEditing ? "Disable Editing" : "Enable Mission Editing"}
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span className="text-[8px] font-mono uppercase">{isEditing ? 'Active' : 'Edit'}</span>
                                </button>
                                <button
                                    onClick={() => handleRegenerateItinerary()}
                                    className="flex flex-col items-center gap-1 text-amber-500/80 hover:text-amber-400 transition-colors p-2"
                                    title="Regenerate Parameters"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span className="text-[8px] font-mono uppercase">Regen</span>
                                </button>
                            </div>

                            {/* RIGHT: ADMIN & SYSTEM */}
                            {/* RIGHT: ACTIONS (Confirm for Drafts, Mission Control for Confirmed) */}
                            {(() => {
                                if (itinerary.status === 'confirmed') {
                                    const isMember = members.some(m => m.user_id === user?.id);
                                    return (
                                        <div className="flex items-center gap-4">
                                            {/* System Status Readout */}
                                            <div className="hidden lg:flex flex-col items-end mr-4">
                                                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500">
                                                    <span>NET_STABLE</span>
                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                </div>
                                                <div className="text-[9px] font-mono text-zinc-600">
                                                    LAT: {itinerary.destination ? itinerary.destination.length * 1.2 : 0}ms
                                                </div>
                                            </div>

                                            {canConfirm ? (
                                                <button
                                                    onClick={() => setShowSettings(true)}
                                                    className="h-12 px-6 bg-white/5 hover:bg-cyan-500 text-white hover:text-black border border-white/10 hover:border-cyan-400 rounded-lg flex items-center gap-3 transition-all uppercase font-bold text-xs tracking-widest shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)]"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Mission Control</span>
                                                </button>
                                            ) : (
                                                <div className="h-12 px-6 flex items-center justify-center border border-white/5 rounded-lg bg-white/5 opacity-50">
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Spectator Mode</span>
                                                </div>
                                            )}

                                            <button
                                                onClick={handleAbort}
                                                className="h-12 w-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg transition-all"
                                                title="Abort / Exit"
                                            >
                                                <Power className="w-5 h-5" />
                                            </button>
                                        </div>
                                    );
                                } else if (canConfirm) {
                                    // CONFIRM ITINERARY (Draft mode)
                                    return (
                                        <div className="flex items-center gap-4">
                                            <div className="hidden lg:flex flex-col items-end mr-4">
                                                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{isOwner ? 'Est. Cost' : 'Unit Cost'}</div>
                                                <div className="text-sm font-bold text-white font-mono">{formattedCost}</div>
                                            </div>
                                            <button
                                                onClick={() => setShowConfirmModal(true)}
                                                disabled={bookingStatus !== 'idle'}
                                                className="h-12 px-8 bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-bold text-xs tracking-widest uppercase rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"
                                            >
                                                {bookingStatus === 'idle' ? (
                                                    <><ShieldCheck className="w-4 h-4" /> Confirm Itinerary</>
                                                ) : (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing</>
                                                )}
                                            </button>
                                            <button
                                                onClick={handleAbort}
                                                className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-white border border-white/10 hover:border-red-500 rounded-lg transition-all"
                                                title="Abort / Exit"
                                            >
                                                <Power className="w-5 h-5" />
                                            </button>
                                        </div>
                                    );
                                } else {
                                    // Guest viewing a draft who isn't a member yet
                                    return (
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 px-6 flex items-center justify-center border border-white/5 rounded-lg bg-white/5 opacity-50">
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Spectator</span>
                                            </div>
                                            <button
                                                onClick={handleAbort}
                                                className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-white border border-white/10 hover:border-red-500 rounded-lg transition-all"
                                                title="Exit"
                                            >
                                                <Power className="w-5 h-5" />
                                            </button>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                )
            }

            <style>{`
                .animate-slide-up-fade {
                    animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideUpFade {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            {/* SQUAD SIDEBAR */}
            {
                wizardState === 'RESULTS' && itinerary?.status === 'confirmed' && (
                    <SquadSidebar
                        members={members}
                        presence={presence}
                        messages={messages}
                        polls={polls}
                        votes={votes}
                        userVotes={userVotes}
                        missionCode={missionCode}
                        currentUser={user}
                        onInviteClick={() => setShowInviteModal(true)}
                        onSendMessage={sendMessage}
                        onCreatePoll={createPoll}
                        onCastVote={castVote}
                        onRefreshSquad={refreshSquad}
                        onRefreshCode={refreshMissionCode}
                        rawMessages={rawMessages}
                    />
                )
            }

            {/* MISSION POLLS OVERLAY */}
            {
                wizardState === 'RESULTS' && itinerary?.status === 'confirmed' && polls.length > 0 && (
                    <div className="fixed bottom-32 right-8 z-[1001] flex flex-col gap-4 max-w-sm pointer-events-none">
                        {polls.map((poll) => {
                            const pollVotes = votes[poll.id] || {};
                            const optionsWithVotes = poll.options.map(opt => ({
                                ...opt,
                                votes: pollVotes[opt.id] || 0
                            }));

                            return (
                                <div key={poll.id} className="pointer-events-auto">
                                    <ObjectivePoll
                                        id={poll.id}
                                        question={poll.question}
                                        options={optionsWithVotes}
                                        expiresAt={poll.expires_at}
                                        hasVoted={!!userVotes[poll.id]}
                                        onVote={(optionId) => castVote(poll.id, optionId)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {/* INVITE CODE MODAL */}
            {
                showInviteModal && (
                    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowInviteModal(false)} />
                        <div className="relative bg-[#050505] border border-white/10 p-8 max-w-sm w-full shadow-[0_0_50px_rgba(34,211,238,0.2)]">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-cyan-950/10 rounded-full flex items-center justify-center mb-6 border border-cyan-500/30">
                                    <Users className="w-8 h-8 text-cyan-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Deploy Squad</h3>
                                <p className="text-zinc-500 text-xs font-mono mb-8 uppercase tracking-wider">Mission ID: {currentTripId?.slice(0, 8)}</p>

                                <div className="w-full bg-white/5 border border-white/10 p-6 mb-8 text-center">
                                    <span className="text-4xl font-bold text-white font-mono tracking-[0.2em]">{missionCode || '----'}</span>
                                </div>

                                <button
                                    onClick={() => {
                                        if (missionCode) {
                                            navigator.clipboard.writeText(missionCode);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                            // Keeping modal open helps user see the "Copied" feedback
                                            // setShowInviteModal(false); 
                                        }
                                    }}
                                    disabled={!missionCode}
                                    className="w-full py-4 bg-cyan-400 text-black font-bold uppercase tracking-widest text-xs hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {missionCode ? (copied ? 'Code Copied' : 'Copy Mission Code') : 'Generating...'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* AUDIT LOG MODAL */}
            {
                showAuditModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowAuditModal(false)} />
                        <div className="relative bg-[#050505] border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-cyan-400" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Validation_Audit_Log.bin</h3>
                                </div>
                                <button onClick={() => setShowAuditModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed">
                                <div className="text-cyan-400/60 mb-4">
                                    [SYSTEM] Initializing stream... <br />
                                    [SYSTEM] Loading mission parameters for {itinerary?.destination}... <br />
                                    [SYSTEM] Executing Deep Scan Audit...
                                </div>

                                <div className="space-y-4">
                                    {auditLog.map((log, i) => (
                                        <div key={i} className={`p-3 border-l-2 ${log.status === 'corrected' ? 'border-orange-500 bg-orange-500/5' : 'border-emerald-500 bg-emerald-500/5'}`}>
                                            <div className="flex justify-between mb-1">
                                                <span className={log.status === 'corrected' ? 'text-orange-400 font-bold' : 'text-emerald-400 font-bold'}>
                                                    [{log.status.toUpperCase()}] DAY {log.day}
                                                </span>
                                            </div>
                                            <div className="text-white font-bold mb-1">{log.title}</div>
                                            <div className="text-zinc-400 italic">{log.note}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 text-emerald-400/60">
                                    [SYSTEM] Scan completed. <br />
                                    [SYSTEM] Itinerary integrity confirmed. <br />
                                    [SYSTEM] Ready for deployment.
                                </div>
                            </div>
                            <div className="p-4 border-t border-white/10 bg-zinc-900/50 flex justify-end">
                                <button
                                    onClick={() => setShowAuditModal(false)}
                                    className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 transition-colors"
                                >
                                    Close Log
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* LAUNCH PROTOCOL MODAL */}
            {
                showConfirmModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in" onClick={() => setShowConfirmModal(false)} />
                        <div className="relative bg-black border border-white/20 p-8 max-w-md w-full shadow-[0_0_50px_rgba(34,211,238,0.2)] animate-fade-in-up">
                            {/* Cinematic Border Gradient */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-emerald-400" />
                            <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l from-violet-500 to-fuchsia-500" />

                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-20 h-20 bg-cyan-950/10 rounded-full flex items-center justify-center mb-6 border border-cyan-500/30 relative">
                                    <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-spin-slow" />
                                    <div className="absolute inset-2 rounded-full border border-dotted border-emerald-400/30 animate-reverse-spin" />
                                    <Plane className="w-8 h-8 text-cyan-400 rotate-[-45deg]" />
                                </div>
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-1">Confirm Trip</h3>
                                <div className="text-[10px] text-cyan-400 font-mono tracking-[0.2em] mb-4">LOGISTICS PREPARATION</div>
                                <p className="text-zinc-400 text-sm font-mono max-w-xs">
                                    Confirming itinerary for <span className="text-white font-bold">{cleanDestination(itinerary?.destination)}</span>.
                                </p>
                            </div>

                            {/* DATE PICKER MODULE */}
                            <div className="mb-8">
                                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-widest">
                                    Select Start Date
                                </label>
                                <div className="relative group" onMouseLeave={() => setHoverDate(null)}>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={handleDateChange}
                                        onDayMouseEnter={(date) => setHoverDate(date)}

                                        excludeDateIntervals={excludedIntervals}
                                        minDate={new Date()}
                                        dateFormat="yyyy-MM-dd"
                                        placeholderText="Select a date"
                                        className="relative w-full bg-black border border-white/20 text-white font-mono text-center py-4 px-4 focus:outline-none focus:border-cyan-400 transition-colors uppercase tracking-widest rounded-sm z-10"
                                        calendarClassName="dark-datepicker"
                                        wrapperClassName="w-full"
                                        popperPlacement="bottom"
                                        dayClassName={(date) => "bg-transparent hover:bg-transparent"}
                                        renderDayContents={(day, date) => {
                                            const dateStr = date.toDateString();
                                            let status: 'selected' | 'preview-valid' | 'preview-invalid' | 'excluded' | 'none' = 'none';

                                            // Check Excluded OR Past
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const isPast = date < today;

                                            const isExcludedInterval = excludedIntervals.some(interval =>
                                                date.getTime() >= interval.start.getTime() &&
                                                date.getTime() <= interval.end.getTime()
                                            );

                                            if (isExcludedInterval || isPast) status = 'excluded';
                                            else if (tripDates.has(dateStr)) status = 'selected';
                                            else {
                                                const preview = previewDates.get(dateStr);
                                                if (preview === 'valid') status = 'preview-valid';
                                                else if (preview === 'invalid') status = 'preview-invalid';
                                            }

                                            // Determine Position
                                            let position: 'start' | 'middle' | 'end' | 'single' = 'single';
                                            const checkNeighbor = (offset: number) => {
                                                const neighbor = new Date(date);
                                                neighbor.setDate(neighbor.getDate() + offset);
                                                const nStr = neighbor.toDateString();

                                                if (status === 'excluded') {
                                                    return excludedIntervals.some(interval =>
                                                        neighbor.getTime() >= interval.start.getTime() &&
                                                        neighbor.getTime() <= interval.end.getTime()
                                                    );
                                                }
                                                if (status === 'selected') return tripDates.has(nStr);
                                                if (status === 'preview-valid') return previewDates.get(nStr) === 'valid';
                                                if (status === 'preview-invalid') return previewDates.get(nStr) === 'invalid';

                                                return false;
                                            };

                                            const hasPrev = checkNeighbor(-1);
                                            const hasNext = checkNeighbor(1);

                                            if (hasPrev && hasNext) position = 'middle';
                                            else if (hasPrev && !hasNext) position = 'end';
                                            else if (!hasPrev && hasNext) position = 'start';

                                            // Base Classes - FULL SIZE
                                            const wrapperClass = "relative w-full h-full flex items-center justify-center z-10 font-mono text-sm";
                                            const bgBase = "absolute inset-0 transition-all duration-200 ease-out";

                                            let bgClass = "";
                                            let textClass = "text-zinc-500 group-hover:text-zinc-200 transition-colors";
                                            let roundingClass = "rounded-none";
                                            let styleObj = {};

                                            if (status === 'selected') {
                                                bgClass = "border-2 border-cyan-400 bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.3)]";
                                                textClass = "text-cyan-300 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]";
                                            } else if (status === 'preview-valid') {
                                                bgClass = "bg-cyan-500/30 backdrop-blur-sm shadow-[0_0_10px_rgba(34,211,238,0.1)]";
                                                textClass = "text-cyan-50 font-bold";
                                            } else if (status === 'preview-invalid') {
                                                // Red Fill (Smooth)
                                                bgClass = "bg-red-500/20 backdrop-blur-sm border-2 border-red-500/30";
                                                textClass = "text-red-300 font-bold opacity-90";
                                            } else if (status === 'excluded') {
                                                // RED HAZARD PATTERN: Black & Dark Red Stripes
                                                styleObj = {
                                                    backgroundImage: "repeating-linear-gradient(45deg, #09090b, #09090b 10px, #450a0a 10px, #450a0a 20px)"
                                                };
                                                bgClass = "border border-red-900/30 opacity-80";
                                                textClass = "text-red-500/60 font-medium cursor-not-allowed";
                                            }

                                            // Shape Logic for Seamless Range
                                            if (status === 'selected' || status === 'preview-valid') {
                                                if (position === 'start') roundingClass = "rounded-l-md border-r-0 mr-[-1px]"; // Negative margin to pull next item
                                                else if (position === 'end') roundingClass = "rounded-r-md border-l-0 ml-[-1px]";
                                                else if (position === 'middle') roundingClass = "rounded-none border-x-0 mx-[-1px]";
                                                else if (position === 'single') roundingClass = "rounded-md";
                                            } else {
                                                // Default rounding for single items (invalid/excluded)
                                                roundingClass = "rounded-md";
                                            }

                                            if (status === 'none') {
                                                bgClass = "hidden"; // Hide bg for none
                                            }

                                            return (
                                                <div className={wrapperClass}>
                                                    {status !== 'none' && (
                                                        <div className={`${bgBase} ${bgClass} ${roundingClass}`} style={styleObj} />
                                                    )}
                                                    <span className={`relative z-20 ${textClass}`}>{day}</span>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none z-20" />
                                </div>
                                <div className="mt-2 text-[10px] font-mono text-center h-4">
                                    {startDate ? (
                                        <span className="text-emerald-500/70">Selected: {startDate.toLocaleDateString('en-CA')}</span>
                                    ) : (
                                        <span className="text-zinc-500">Blocked dates are grayed out</span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 mb-8">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold uppercase text-zinc-500">Logistics Cost</span>
                                    <span className="text-white font-bold font-mono">{formattedCost}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-zinc-500">Duration</span>
                                    <span className="text-white font-bold font-mono">{itinerary?.duration}</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-4 border border-white/20 text-zinc-400 hover:text-white hover:border-white font-bold uppercase tracking-widest text-xs transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleBookItinerary}
                                    disabled={!startDate || !!dateConflictWarning}
                                    className={`flex-1 py-4 font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_30px_rgba(34,211,238,0.2)] ${(!startDate || dateConflictWarning) ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-black hover:scale-105 hover:shadow-[0_0_50px_rgba(34,211,238,0.5)]'}`}
                                >
                                    {!startDate ? 'Select Date' : dateConflictWarning ? 'Date Blocked' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* --- CREDIT ALERT MODAL (CUSTOM STYLE) --- */}
            {
                showCreditAlert && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                            onClick={() => setShowCreditAlert(false)}
                        />

                        {/* Modal Content */}
                        <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-200">
                            {/* Glow Effect */}
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-[80px]" />

                            <div className="relative z-10 flex flex-col items-center text-center gap-6">
                                <div className="w-16 h-16 rounded-full bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                                    <DollarSign className="w-8 h-8 text-cyan-400" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Insufficient Credits</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        You need <span className="text-white font-bold">1 Credit</span> to generate a trip.
                                    </p>
                                </div>

                                <div className="flex flex-col w-full gap-3 mt-2">
                                    <button
                                        onClick={() => {
                                            if (prompt.trim()) {
                                                localStorage.setItem('voyageur_saved_prompt', prompt);
                                            }
                                            setShowCreditAlert(false);
                                            setView(AppView.PRICING);
                                        }}
                                        className="w-full py-3 bg-gradient-to-r from-cyan-400 to-cyan-500 text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:brightness-110 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                                    >
                                        Get Credits
                                    </button>
                                    <button
                                        onClick={() => setShowCreditAlert(false)}
                                        className="w-full py-3 bg-transparent border border-white/10 text-zinc-500 font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* SIDEBAR MAP DRAWER */}
            {
                typeof document !== 'undefined' && itinerary && createPortal(
                    <>
                        {/* Overlay / Backdrop */}
                        <div
                            className={`fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isMapOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                            onClick={() => setIsMapOpen(false)}
                        />

                        {/* Sliding Drawer Panel */}
                        <div
                            className={`fixed inset-y-0 right-0 z-[1001] w-full md:w-[500px] bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isMapOpen ? 'translate-x-0' : 'translate-x-full'}`}
                        >
                            {/* PROTRUDING TAB (Arrow Mark) - Enhanced Tactical Visibility */}
                            {itinerary?.status === 'confirmed' && (
                                <button
                                    onClick={() => setIsMapOpen(!isMapOpen)}
                                    className={`absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-10 h-72 bg-zinc-900 border-y border-l border-cyan-500/50 rounded-l-2xl flex items-center justify-center transition-all duration-300 group hover:bg-cyan-950/40 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] ${isMapOpen ? 'opacity-30 hover:opacity-100' : 'opacity-100 shadow-[0_0_20px_rgba(0,0,0,0.6)]'}`}
                                >
                                    <div className="flex flex-col items-center gap-12">
                                        <ChevronLeft className={`w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-all duration-500 shadow-sm ${isMapOpen ? 'rotate-180' : ''}`} />
                                        <div className="[writing-mode:vertical-lr] text-[9px] font-black text-cyan-500/80 group-hover:text-cyan-400 tracking-[0.8em] transition-colors uppercase font-mono">MAP_TACTICAL_INTEL</div>
                                        <ChevronLeft className={`w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-all duration-500 shadow-sm ${isMapOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                            )}

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                                        <MapIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Target Map</h3>
                                        <p className="text-xs text-zinc-500 font-mono">DAY {activeDay + 1} INTEL</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMapOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Map Content */}
                            <div className="p-6 h-[calc(100vh-80px)] overflow-y-auto">
                                <div className="mb-6">
                                    <DayMap
                                        locations={dayLocations}
                                        squadPresence={itinerary?.status === 'confirmed' ? presence : {}}
                                        members={members}
                                        height="400px"
                                    />
                                </div>

                                {/* DEBUG: View Raw Data */}
                                <div className="mb-6 border-b border-white/10 pb-6">
                                    <details className="group">
                                        <summary className="cursor-pointer text-xs text-red-400 font-mono hover:text-red-300 flex items-center gap-2">
                                            <span>🐞 DEBUG: View Raw Data</span>
                                        </summary>
                                        <div className="mt-2 p-3 bg-black/50 rounded border border-white/10 overflow-x-auto">
                                            <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap">
                                                {JSON.stringify(itinerary?.days?.[activeDay]?.activities?.map(a => ({ title: a.title, coords: a.coordinates })), null, 2)}
                                            </pre>
                                        </div>
                                    </details>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-4">Located Targets</h4>
                                    {dayLocations.length > 0 ? (
                                        dayLocations.map((loc, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                                                <div className="w-6 h-6 rounded-full bg-black border border-white/20 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <div className="text-sm border-l-2 border-emerald-500/50 pl-2 font-bold text-white mb-0.5">{loc.name}</div>
                                                    <div className="text-[10px] pl-2 text-zinc-500 font-mono uppercase tracking-wider">
                                                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                                    </div>
                                                </div>
                                                <a
                                                    href={getCoordinatesLink(loc.lat, loc.lng, loc.name)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-auto p-2 bg-black border border-white/10 rounded hover:border-cyan-400 hover:text-cyan-400 transition-colors"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 border border-dashed border-white/10 rounded">
                                            <MapIcon className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                            <p className="text-zinc-500 text-sm">No GPS coordinates available for this sector.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )
            }

            {/* TOAST SYSTEM */}
            {
                toastMessage && (
                    <div
                        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100000] px-4 py-2 rounded border shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toastMessage.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                            toastMessage.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                toastMessage.type === 'info' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' :
                                    'bg-zinc-800 border-white/10 text-white'
                            }`}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{toastMessage.message}</span>
                    </div>
                )
            }

            {/* CONFIRMATION MODAL */}
            {
                confirmation.isOpen && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-zinc-950 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                            <div className={`flex items-center gap-3 mb-4 ${confirmation.type === 'success' ? 'text-emerald-500' :
                                confirmation.type === 'warning' ? 'text-amber-500' :
                                    confirmation.type === 'danger' ? 'text-red-500' :
                                        'text-cyan-500'
                                }`}>
                                <div className="w-10 h-10 rounded-full bg-current/10 flex items-center justify-center">
                                    {confirmation.type === 'success' ? '✓' :
                                        confirmation.type === 'warning' ? '⚠' :
                                            confirmation.type === 'danger' ? '✕' : 'ℹ'}
                                </div>
                                <h3 className="text-lg font-bold uppercase tracking-wider">{confirmation.title}</h3>
                            </div>
                            <p className="text-zinc-400 text-sm mb-6">{confirmation.message}</p>
                            <div className="flex gap-3 justify-end">
                                {!confirmation.singleAction && (
                                    <button
                                        onClick={() => setConfirmation({ ...confirmation, isOpen: false })}
                                        className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (confirmation.onConfirm) confirmation.onConfirm();
                                        setConfirmation({ ...confirmation, isOpen: false });
                                    }}
                                    className={`px-4 py-2 text-sm font-bold rounded ${confirmation.type === 'danger' ? 'bg-red-500 text-white' :
                                        confirmation.type === 'success' ? 'bg-emerald-500 text-black' :
                                            'bg-cyan-500 text-black'
                                        }`}
                                >
                                    {confirmation.singleAction ? 'OK' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
                .clip-path-slant {
                    clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
                }

                /* Dark Datepicker Overrides */
                .dark-datepicker {
                    background-color: #000000 !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 0 !important;
                    font-family: 'JetBrains Mono', monospace !important;
                    color: white !important;
                }
                .dark-datepicker .react-datepicker__header {
                    background-color: #000000 !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 0 !important;
                    padding-top: 15px !important;
                }
                .dark-datepicker .react-datepicker__current-month,
                .dark-datepicker .react-datepicker-time__header,
                .dark-datepicker .react-datepicker-year-header {
                    color: white !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.1em !important;
                    font-size: 0.8rem !important;
                }
                .dark-datepicker .react-datepicker__day-name {
                    color: rgba(255, 255, 255, 0.4) !important;
                    font-size: 0.7rem !important;
                    text-transform: uppercase !important;
                }
                .dark-datepicker .react-datepicker__day {
                    color: white !important;
                    border-radius: 0 !important;
                    transition: all 0.2s ease !important;
                }
                .dark-datepicker .react-datepicker__day:hover {
                    background-color: rgba(34, 211, 238, 0.2) !important;
                    color: #22d3ee !important;
                }
                .dark-datepicker .react-datepicker__day--selected,
                .dark-datepicker .react-datepicker__day--keyboard-selected {
                    background-color: #22d3ee !important;
                    color: black !important;
                    font-weight: bold !important;
                }
                .dark-datepicker .react-datepicker__day--disabled {
                    color: rgba(255, 255, 255, 0.1) !important;
                    background-color: transparent !important;
                }
                .dark-datepicker .react-datepicker__navigation-icon::before {
                    border-color: white !important;
                }
                .dark-datepicker .react-datepicker__day--outside-month {
                    color: rgba(255, 255, 255, 0.1) !important;
                }
                .dark-datepicker .react-datepicker__triangle {
                    display: none !important;
                }
            `}</style>
        </div >
    );
};

export default TripPlanner;