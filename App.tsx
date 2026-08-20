
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ConfirmationModal } from './components/ConfirmationModal';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import TripPlanner from './components/TripPlanner';
import DiningConcierge from './components/DiningConcierge';
import Auth from './components/Auth';
import About from './components/About';
import HowItWorks from './components/HowItWorks';
import Dashboard from './components/Dashboard';
import Pricing from './components/Pricing';
import Blog from './components/Blog';
import Rewards from './components/Rewards';
import Wallet from './components/Wallet';
import Support from './components/Support';
import TravelDNA from './components/TravelDNA';
import Community from './components/Community';
import Marketplace from './components/Marketplace';
import Achievements from './components/Achievements';
import Sustainability from './components/Sustainability';
import Billing from './components/Billing';
import Notifications from './components/Notifications';
import Referral from './components/Referral';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import CancellationRefund from './components/CancellationRefund';
import ShippingPolicy from './components/ShippingPolicy';
import UpdatePassword from './components/UpdatePassword';
import { AppView, UserProfile } from './types';
import { dbService } from './services/dbService';
import { supabase } from './services/supabaseClient'; // Import supabase client
import LoadingScreen from './components/LoadingScreen';
import IntroLoader from './components/IntroLoader';
import ErrorBoundary from './components/ErrorBoundary';
import { CelestialEngine } from './components/ui/CelestialEngine';
import { useDelayedLoading } from './hooks/useDelayedLoading';

const App: React.FC = () => {
  // OPTIMISTIC SESSION CHECK: Did we have a session recently?
  const [initialSessionDetected] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check for any supabase auth token in localStorage (key usually starts with 'sb-')
      // OR check our own cache keys
      const keys = Object.keys(localStorage);
      const hasAuthToken = keys.some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const hasVoyageurCache = keys.some(k => k.startsWith('voyageur_fullname_'));
      return hasAuthToken || hasVoyageurCache;
    }
    return false;
  });

  const [currentView, setView] = useState<AppView>(AppView.LANDING);
  const [history, setHistory] = useState<AppView[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [planningPrompt, setPlanningPrompt] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [isHydrating, setIsHydrating] = useState(false); // Prevents "Traveler" flash on fresh login
  const [joinConfirmTrip, setJoinConfirmTrip] = useState<any | null>(null);
  const joiningMissionRef = useRef<string | null>(null); // Guard for concurrent join triggers

  const [authError, setAuthError] = useState<string | null>(null);
  const [dashboardInitialTab, setDashboardInitialTab] = useState<'overview' | 'prompts' | 'settings'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('voyageur_dashboard_active_tab');
      return (saved === 'overview' || saved === 'prompts' || saved === 'settings') ? saved : 'overview';
    }
    return 'overview';
  });
  const [navVisible, setNavVisible] = useState(true); // NEW: Manage global nav visibility

  const [authChecked, setAuthChecked] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  const isLoggedIn = !!user;

  // Scroll to top whenever the view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  // Handle URL Error Params and Password Reset Route (Global)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const pathname = window.location.pathname;

    // Handle password reset link from email
    // Supabase sends recovery token in URL hash like: #access_token=...&type=recovery
    if (hash.includes('type=recovery') || pathname === '/update-password') {
      setView(AppView.UPDATE_PASSWORD);
      // Clean the URL but keep hash for Supabase to process the token
      if (pathname === '/update-password') {
        window.history.replaceState({}, '', '/' + window.location.hash);
      }
    }
    // Handle no_account error
    else if (params.get('error') === 'no_account') {
      // Set error state to pass to Auth component
      setAuthError("Account does not exist. Please Sign Up first.");
      // Force view to AUTH
      setView(AppView.AUTH);
      // Clean URL immediately so it doesn't persist on refresh/navigation
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Check for 'view' query param (For Razorpay/Compliance links)
    const viewParam = params.get('view');
    if (viewParam) {
      if (viewParam === 'refund') setView(AppView.REFUND);
      else if (viewParam === 'shipping') setView(AppView.SHIPPING);
      else if (viewParam === 'terms') setView(AppView.TERMS);
      else if (viewParam === 'privacy') setView(AppView.PRIVACY);
      else if (viewParam === 'contact') setView(AppView.SUPPORT);
      else if (viewParam === 'pricing') setView(AppView.PRICING);
    }

    // Check for 'join' query param (Squad invite link)
    const joinParam = params.get('join');
    if (joinParam) {
      console.log("🎟️ [App] Found 'join' parameter in URL:", joinParam);
      handleJoinMission(joinParam);
      // Clean URL to prevent re-joining on reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Clear auth error when switching views
  useEffect(() => {
    if (currentView !== AppView.AUTH) {
      setAuthError(null);
    }
  }, [currentView]);

  // Handle Pending Purchase Redirect
  useEffect(() => {
    if (user) {
      const pending = localStorage.getItem('pending_purchase');
      if (pending) {
        console.log("💳 [App] Found pending purchase, redirecting to Pricing...");
        setView(AppView.PRICING);
        // We don't clear it here, Pricing component will handle/clear it
      }
    }
  }, [user]);

  // Listen for user profile updates from Dashboard
  useEffect(() => {
    const handleUserUpdate = (e: any) => {
      const fullName = e?.detail?.fullName;
      if (!fullName) return;

      console.log("🔄 [App] Received user update event:", fullName);
      setUser(prev => (prev ? { ...prev, fullName } : null));
    };

    window.addEventListener('voyageur:user-update', handleUserUpdate);
    return () => window.removeEventListener('voyageur:user-update', handleUserUpdate);
  }, []);

  // Listen for Supabase Session Changes
  useEffect(() => {
    if (supabase) {
      let mounted = true;

      // Listen for changes (sign in, sign out, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;

        console.log("🔍 [App.tsx] Auth Change:", _event);

        if (session?.user) {
          console.log("👤 [App.tsx] User Metadata:", session.user.user_metadata);

          // Unified Session Handling (Stateless)
          // Read cached credits and name from localStorage to prevent flicker
          console.log("🔍 [App.tsx] RAW Session Metadata:", session.user.user_metadata);
          const cachedCredits = parseInt(localStorage.getItem(`voyageur_credits_${session.user.id}`) || '0', 10);
          const cachedName = localStorage.getItem(`voyageur_fullname_${session.user.id}`);
          const cachedAvatar = localStorage.getItem(`voyageur_avatar_${session.user.id}`);

          // FAST PATH: Cache exists, render immediately
          if (cachedName) {
            setUser({
              id: session.user.id,
              fullName: cachedName,
              email: session.user.email!,
              credits: cachedCredits,
              avatarUrl: cachedAvatar || session.user.user_metadata.avatar_url,
              createdAt: new Date(session.user.created_at).getTime()
            });
            setIsHydrating(false);
          } else {
            // SLOW PATH: No cache (Fresh login/Cleared). Block UI to prevent "Traveler" flash.
            console.log("⏳ [App.tsx] Hydrating from DB...");
            setIsHydrating(true);
          }

          // Fetch fresh profile (credits + name) in background
          dbService.getUserProfile(session.user.id, {
            full_name: session.user.user_metadata.full_name,
            avatar_url: session.user.user_metadata.avatar_url
          }).then(profile => {
            if (mounted && profile) {
              console.log("👤 [App.tsx] Profile fetched:", profile);

              // Update localStorage cache for next load
              localStorage.setItem(`voyageur_credits_${session.user.id}`, profile.credits.toString());
              if (profile.fullName) localStorage.setItem(`voyageur_fullname_${session.user.id}`, profile.fullName);
              if (profile.avatar_url) localStorage.setItem(`voyageur_avatar_${session.user.id}`, profile.avatar_url);

              // Update state (This will be the FIRST render if no cache was found)
              setUser(prev => ({
                id: session.user.id,
                fullName: profile.fullName || (prev?.fullName) || session.user.user_metadata.full_name || "Traveler",
                email: session.user.email!,
                credits: profile.credits,
                avatarUrl: profile.avatar_url || (prev?.avatarUrl) || session.user.user_metadata.avatar_url,
                createdAt: new Date(session.user.created_at).getTime()
              }));

              // Unblock UI once data is ready
              setIsHydrating(false);
            }
          }).catch(e => {
            console.error("❌ [App.tsx] Failed to fetch profile:", e);
            // Fallback: If DB fails and we blocked UI, unblock and show what we have
            if (!cachedName) {
              setUser({
                id: session.user.id,
                fullName: session.user.user_metadata.full_name || "Traveler",
                email: session.user.email!,
                credits: cachedCredits,
                createdAt: new Date(session.user.created_at).getTime()
              });
            }
            setIsHydrating(false);
          });

          // FIX: If name is "Traveler", it might be a stale session. Force refresh.
          if (!session.user.user_metadata.full_name) {
            console.log("🔄 [App.tsx] Name missing. Forcing session refresh...");
            supabase.auth.refreshSession();
          }

          // Auto-redirect to dashboard on login
          if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN') {
            setView((prev) => (prev === AppView.LANDING || prev === AppView.AUTH) ? AppView.DASHBOARD : prev);
          }

          // HIDE INTRO if logged in
          setShowIntro(false);
          setAuthChecked(true);

        } else if (_event === 'SIGNED_OUT') {
          setUser(null);
          setIsHydrating(false);
          if (typeof window !== 'undefined') localStorage.removeItem('voyageur_dashboard_active_tab');
          setView((prev) => prev === AppView.DASHBOARD ? AppView.AUTH : prev);
        } else if ((_event as string) === 'TOKEN_REFRESH_REVOKED') {
          console.log("🛑 [App.tsx] Token Refresh Revoked (Session Expired)");
          setUser(null);
          setAuthError("Session expired. Please sign in again.");
          if (typeof window !== 'undefined') localStorage.removeItem('voyageur_dashboard_active_tab');
          setView(AppView.AUTH);
          setIsHydrating(false);
        } else {
          setUser(null);
          setIsHydrating(false);
          // Only redirect to landing if we are on a protected route
          setView((prev) => {
            const protectedViews = [
              AppView.DASHBOARD, AppView.PLANNER, AppView.DINING,
              AppView.REWARDS, AppView.WALLET, AppView.TRAVEL_DNA,
              AppView.ACHIEVEMENTS, AppView.SUSTAINABILITY
            ];
            return protectedViews.includes(prev) ? AppView.LANDING : prev;
          });
        }
        setIsLoading(false);
      });

      // Check for existing session on load (only to handle "no session" case quickly)
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error("Session check error:", error);
          supabase.auth.signOut();
        }
        // If NO session, enable intro. If session exists, onAuthStateChange handles it.
        if (!session) {
          setShowIntro(true);
          setAuthChecked(true);
          setIsLoading(false);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      setIsLoading(false);
      setAuthChecked(true);
      setShowIntro(true); // Offline mode -> show intro
    }
  }, []);

  // Listen for global user updates (e.g. credits change)
  useEffect(() => {
    const handleUserUpdate = async () => {
      if (user) {
        console.log("🔄 [App] Refreshing User Data (Credits)...");
        const credits = await dbService.getUserCredits(user.id);
        setUser(prev => prev ? ({ ...prev, credits }) : null);
      }
    };
    window.addEventListener('voyageur:user-update', handleUserUpdate);
    return () => window.removeEventListener('voyageur:user-update', handleUserUpdate);
  }, [user]);

  const handleJoinMission = async (code: string) => {
    if (!code || code.length < 4) return;

    // Guard against concurrent joins for the same code
    if (joiningMissionRef.current === code) return;
    joiningMissionRef.current = code;

    if (!user) {
      console.log("🎟️ [App] Guest joining mission, saving code and redirecting to Auth...");
      localStorage.setItem('voyageur_pending_mission', code);
      handleSetView(AppView.AUTH);
      joiningMissionRef.current = null;
      return;
    }

    try {
      setIsLoading(true);
      const tripId = await dbService.joinSquad(user.id, code);
      if (tripId) {
        console.log("✅ [App] Joined mission successfully:", tripId);

        // Wait for RLS policies to propagate/cache invalidate if necessary
        // Fetch the full trip details including data
        let trip = null;
        let attempts = 0;

        while (!trip && attempts < 5) {
          attempts++;
          if (attempts > 1) await new Promise(r => setTimeout(r, 500)); // Backoff
          trip = await dbService.getTripById(user.id, tripId);
          if (!trip) console.log(`[App] Trip fetch attempt ${attempts} failed, retrying...`);
        }

        if (trip) {
          console.log("📦 [App] Loaded tactical information:", trip.id);
          // show confirmation modal instead of immediate redirect
          setJoinConfirmTrip(trip);
        } else {
          console.error("❌ [App] Failed to load trip parameters after join");
          alert("Mission joined, but tactical feed is offline. Please refresh.");
        }
      } else {
        alert("INVALID MISSION CODE: Deployment sequence aborted.");
      }
    } catch (err) {
      console.error("❌ [App] Error joining mission:", err);
      alert("CRITICAL ERROR: Squad sync failed.");
    } finally {
      setIsLoading(false);
      localStorage.removeItem('voyageur_pending_mission');
      joiningMissionRef.current = null;
    }
  };

  const handleConfirmJoin = async () => {
    if (!joinConfirmTrip || !user) {
      setJoinConfirmTrip(null);
      return;
    }

    // 1. Add to Interaction Logs (Prompt Log) as per user request
    const promptId = dbService.savePromptWithStatus({
      user_id: user.id,
      prompt: joinConfirmTrip.data?.originalPrompt || `Joined mission to ${joinConfirmTrip.destination}`,
      destination: joinConfirmTrip.destination,
      status: joinConfirmTrip.status || 'confirmed',
      result: joinConfirmTrip.data
    });

    // 2. Select and Navigate
    // Sync the joined trip and link it to the newly created prompt entry
    // Force updated_at so the Dashboard pruning logic (60s grace) considers this 'new'
    const authoritativeJoinedTrip = {
      ...joinConfirmTrip,
      status: 'confirmed' as const,
      promptId,
      is_joined: true,
      updated_at: Date.now()
    };

    await dbService.syncJoinedTrip(user.id, authoritativeJoinedTrip, promptId);
    setSelectedTrip(authoritativeJoinedTrip);
    handleSetView(AppView.PLANNER);

    // 3. Cleanup
    setJoinConfirmTrip(null);
    window.dispatchEvent(new CustomEvent('voyageur:db-update')); // Force Dashboard refresh if it's in background
    window.dispatchEvent(new CustomEvent('voyageur:trip-update'));
  };

  const handleCancelJoin = async () => {
    if (!joinConfirmTrip || !user) {
      setJoinConfirmTrip(null);
      return;
    }

    setIsLoading(true);
    await dbService.leaveSquad(user.id, joinConfirmTrip.id);
    setJoinConfirmTrip(null);
    setIsLoading(false);
  };

  // Check for pending mission on login
  useEffect(() => {
    if (user) {
      const pendingCode = localStorage.getItem('voyageur_pending_mission');
      if (pendingCode) {
        console.log("🎟️ [App] Found pending mission code, joining now...");
        handleJoinMission(pendingCode);
      }
    }
  }, [user]);

  const handleSetView = (view: AppView, dashboardTab: 'overview' | 'prompts' | 'settings' = 'overview') => {
    setHistory((prev) => [...prev, currentView]);
    if (view === AppView.PLANNER && currentView !== AppView.PLANNER) {
      setPlanningPrompt('');
      // DO NOT clear selectedTrip here. It overrides the trip we just set in dashboard!
      // setSelectedTrip(null); 
    }

    // Reset dashboard tab if navigating there
    if (view === AppView.DASHBOARD) {
      setDashboardInitialTab(dashboardTab);
    }

    setView(view);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prevView = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setView(prevView);
    } else {
      setView(AppView.LANDING);
    }
  };

  // Views where the back button should remain hidden (Main Pillars)
  const hideBackButton = [
    AppView.LANDING,
    AppView.DASHBOARD,
    AppView.PLANNER,
    AppView.DINING,
    AppView.AUTH
  ].includes(currentView);

  // Delay the busy indicator to avoid flashing for fast loads
  // Delay the busy indicator to avoid flashing for fast loads
  const showBusyLoader = useDelayedLoading(isLoading || isHydrating, 4000);

  // Black screen while checking auth to prevent flash
  if (!authChecked) {
    return <div className="min-h-screen bg-black" />;
  }

  if (showIntro) {
    return <IntroLoader onComplete={() => setShowIntro(false)} />;
  }

  // Fallback for internal loading states (after Intro is done)
  // We use a simple black screen to prevent "Vertical Bar" flashes during fast loads.
  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-blue-500/30 flex flex-col relative">
      {(!initialSessionDetected || currentView === AppView.LANDING || currentView === AppView.AUTH || currentView === AppView.UPDATE_PASSWORD || currentView === AppView.HOW_IT_WORKS) && <CelestialEngine />}

      <Navigation
        currentView={currentView}
        setView={handleSetView}
        isLoggedIn={isLoggedIn}
        user={user}
        setIsLoggedIn={(val) => {
          if (!val) {
            setUser(null);
            if (supabase) supabase.auth.signOut();
          }
        }}
        isVisible={navVisible} // Pass visibility state
      />

      {/* Global Back Button - Top Right */}
      {!hideBackButton && (
        <button
          onClick={handleBack}
          className="fixed top-24 right-6 z-[1200] p-3 bg-black/50 backdrop-blur-md border border-white/20 rounded-full hover:bg-white hover:text-black transition-all group"
          aria-label="Go Back"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
      )}

      {/* Global Loading Overlay - MOVED TO ROOT & FIXED to ensure full coverage */}
      {(isLoading || isHydrating) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 bg-black/50 backdrop-blur-sm">
          {/* OPTIMISTIC BACKGROUND: Show Mountain BG immediately if session exists */}
          {initialSessionDetected && (
            <div className="absolute inset-0 z-0 bg-zinc-950">
              <img
                src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2546&auto=format&fit=crop"
                alt="Restoring Session..."
                className="w-full h-full object-cover opacity-60"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
            </div>
          )}

          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Main Content Area - Native Scroll */}
      <main className="relative z-10 flex-1 flex flex-col w-full">
        {!isLoading && !isHydrating && currentView === AppView.LANDING && (
          <Hero
            setView={handleSetView}
            onJoinMission={handleJoinMission}
          />
        )}
        {
          currentView === AppView.DASHBOARD && (
            <ErrorBoundary>
              <Dashboard
                setView={handleSetView}
                user={user}
                initialTab={dashboardInitialTab}
                onLoadTrip={(trip) => {
                  setSelectedTrip(trip);
                  handleSetView(AppView.PLANNER);
                }}
                onJoinMission={handleJoinMission}
                onSignOut={() => supabase.auth.signOut()}
                setIsLoggedIn={(val) => {
                  if (!val) {
                    setUser(null);
                    if (supabase) supabase.auth.signOut();
                  }
                }}
              />
            </ErrorBoundary>
          )
        }
        {
          currentView === AppView.PLANNER && (
            <TripPlanner
              prompt={planningPrompt}
              setPrompt={setPlanningPrompt}
              isLoggedIn={isLoggedIn}
              user={user}
              setView={handleSetView}
              setNavVisible={setNavVisible} // Pass setter to TripPlanner
              initialTrip={selectedTrip}
              clearSelectedTrip={() => setSelectedTrip(null)}
              onBackToLogs={() => {
                setSelectedTrip(null); // Clear trip when going back manually
                handleSetView(AppView.DASHBOARD, 'overview');
              }}
            />
          )
        }
        {currentView === AppView.DINING && <DiningConcierge user={user} />}
        {currentView === AppView.ABOUT && <About />}
        {currentView === AppView.HOW_IT_WORKS && <HowItWorks />}
        {currentView === AppView.PRICING && <Pricing user={user} setView={handleSetView} />}
        {currentView === AppView.BLOG && <Blog />}
        {currentView === AppView.REWARDS && <Rewards />}
        {currentView === AppView.WALLET && <Wallet />}
        {currentView === AppView.SUPPORT && <Support />}
        {currentView === AppView.TRAVEL_DNA && <TravelDNA />}
        {currentView === AppView.COMMUNITY && <Community />}
        {currentView === AppView.MARKETPLACE && <Marketplace />}
        {currentView === AppView.ACHIEVEMENTS && <Achievements />}
        {currentView === AppView.SUSTAINABILITY && <Sustainability />}
        {currentView === AppView.BILLING && <Billing user={user} setView={handleSetView} />}
        {currentView === AppView.NOTIFICATIONS && <Notifications />}
        {currentView === AppView.REFERRAL && <Referral />}
        {currentView === AppView.PRIVACY && <Privacy />}
        {currentView === AppView.TERMS && <Terms />}
        {currentView === AppView.REFUND && <CancellationRefund />}
        {currentView === AppView.SHIPPING && <ShippingPolicy />}
        {currentView === AppView.UPDATE_PASSWORD && <UpdatePassword setView={handleSetView} />}
        {
          currentView === AppView.AUTH && (
            <ErrorBoundary>
              <Auth setView={handleSetView} setUser={setUser} initialError={authError} />
            </ErrorBoundary>
          )
        }
      </main >

      {/* Footer - Only show on Marketing pages AND when NOT logged in */}
      {
        !isLoggedIn && currentView !== AppView.AUTH && currentView !== AppView.DASHBOARD && currentView !== AppView.PLANNER && (
          <footer className="border-t border-white/5 bg-black/40 backdrop-blur-md py-16 relative z-10 w-full">
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-2xl font-bold text-white mb-6">Voyageur</h3>
                <p className="text-slate-500 max-w-sm leading-relaxed">
                  The intersection of artificial intelligence and human expertise.
                  Redefining travel planning for the modern era.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-6">Platform</h4>
                <ul className="space-y-4 text-slate-500 text-sm">
                  <li onClick={() => handleSetView(AppView.PLANNER)} className="hover:text-blue-400 cursor-pointer transition-colors">Trip Planner</li>
                  <li onClick={() => handleSetView(AppView.DINING)} className="hover:text-blue-400 cursor-pointer transition-colors">Dining Concierge</li>
                  <li onClick={() => handleSetView(AppView.PRICING)} className="hover:text-blue-400 cursor-pointer transition-colors">Membership</li>
                  <li onClick={() => handleSetView(AppView.REWARDS)} className="hover:text-blue-400 cursor-pointer transition-colors">Rewards</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-6">Company</h4>
                <ul className="space-y-4 text-slate-500 text-sm">
                  <li onClick={() => handleSetView(AppView.ABOUT)} className="hover:text-blue-400 cursor-pointer transition-colors">About Us</li>
                  <li onClick={() => handleSetView(AppView.HOW_IT_WORKS)} className="hover:text-blue-400 cursor-pointer transition-colors">How it Works</li>
                  <li onClick={() => handleSetView(AppView.BLOG)} className="hover:text-blue-400 cursor-pointer transition-colors">Journal</li>
                  <li onClick={() => handleSetView(AppView.SUPPORT)} className="hover:text-blue-400 cursor-pointer transition-colors">Contact</li>
                </ul>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-xs uppercase tracking-wider">
              <span>© 2024 Voyageur AI Inc.</span>
              <div className="flex gap-6">
                <span onClick={() => handleSetView(AppView.REFUND)} className="hover:text-white cursor-pointer transition-colors">Refunds</span>
                <span onClick={() => handleSetView(AppView.SHIPPING)} className="hover:text-white cursor-pointer transition-colors">Shipping</span>
                <span onClick={() => handleSetView(AppView.PRIVACY)} className="hover:text-white cursor-pointer transition-colors">Privacy</span>
                <span onClick={() => handleSetView(AppView.TERMS)} className="hover:text-white cursor-pointer transition-colors">Terms</span>
              </div>
            </div>
          </footer>
        )
      }
      {/* Mission Join Confirmation Overlay */}
      <ConfirmationModal
        isOpen={!!joinConfirmTrip}
        onClose={() => setJoinConfirmTrip(null)}
        onCancel={handleCancelJoin}
        onConfirm={handleConfirmJoin}
        title="Mission Join Requested"
        message={`Authorize sync for mission to ${joinConfirmTrip?.destination || 'unknown destination'}? This will populate the itinerary in your tactical logs and dashboard.`}
        confirmText="Confirm Handshake"
        cancelText="Abort"
        type="info"
      />
    </div >
  );
};

export default App;
