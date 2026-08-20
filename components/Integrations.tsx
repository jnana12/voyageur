
import React, { useEffect, useState } from 'react';
import { Calendar, Mail, Check, Loader2 } from 'lucide-react';
import { googleCalendarService } from '../services/googleCalendarService';

const Integrations: React.FC = () => {
    // Determine initial state based on real connection status
    const [isGCalConnected, setIsGCalConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Initialize Google Scripts on mount
    useEffect(() => {
        googleCalendarService.init();
        const gcalStatus = googleCalendarService.isConnected();
        setIsGCalConnected(gcalStatus);

        // Restore Gmail status
        const gmailStatus = localStorage.getItem('voyageur_gmail_connected') === 'true';
        setApps(prev => prev.map(app => {
            if (app.id === 'gmail') {
                return { ...app, connected: gmailStatus, lastSync: gmailStatus ? "Linked" : null };
            }
            return app;
        }));

        // Listen for storage changes (in case connected from another tab/component)
        const handleStorageChange = () => {
            // Sync GCal
            setIsGCalConnected(googleCalendarService.isConnected());
            // Sync Gmail
            const gmail = localStorage.getItem('voyageur_gmail_connected') === 'true';
            setApps(prev => prev.map(app => {
                if (app.id === 'gmail') {
                    return { ...app, connected: gmail, lastSync: gmail ? "Linked" : null };
                }
                return app;
            }));
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const [apps, setApps] = useState([
        { id: 'gcal', name: "Google Calendar", desc: "Sync itineraries directly to your schedule.", icon: Calendar, connected: isGCalConnected, lastSync: isGCalConnected ? "Sync enabled" : null },
        { id: 'gmail', name: "Gmail", desc: "Auto-import flight tickets and confirmations.", icon: Mail, connected: false, lastSync: null },
    ]);

    // Update apps state when connection status changes
    useEffect(() => {
        setApps(prev => prev.map(app => {
            if (app.id === 'gcal') {
                return { ...app, connected: isGCalConnected, lastSync: isGCalConnected ? "Ready to sync" : null };
            }
            return app;
        }));
    }, [isGCalConnected]);

    const handleGCalConnect = async () => {
        setIsLoading(true);
        if (isGCalConnected) {
            // Disconnect
            googleCalendarService.disconnect();
            setIsGCalConnected(false);
            window.dispatchEvent(new Event('storage')); // Notify Dashboard
            setIsLoading(false);
        } else {
            // Connect
            try {
                await googleCalendarService.connect();
                // Optional: Verify immediately to ensure consistency
                const isValid = await googleCalendarService.verifyConnection();
                if (isValid) {
                    setIsGCalConnected(true);
                    setAuthError(null);
                    window.dispatchEvent(new Event('storage')); // Notify Dashboard
                } else {
                    setAuthError("Verification failed. Please try again.");
                    setIsGCalConnected(false);
                }
            } catch (err: any) {
                console.error("Connection failed", err);
                setAuthError(err.message || "Failed to connect");
                setIsGCalConnected(false);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const toggleConnection = (index: number) => {
        const app = apps[index];

        // Handle Google Calendar specially
        if (app.id === 'gcal') {
            handleGCalConnect();
            return;
        }

        // Handle Gmail (Simulated Persistence)
        if (app.id === 'gmail') {
            const newState = !app.connected;
            localStorage.setItem('voyageur_gmail_connected', String(newState));

            // Dispatch event for other components (Dashboard) to update immediately
            window.dispatchEvent(new Event('storage'));

            setApps(prev => prev.map((a, i) => {
                if (i === index) {
                    return { ...a, connected: newState, lastSync: newState ? "Just now" : null };
                }
                return a;
            }));
        }
    };

    return (
        <div className="w-full">
            <div className="mb-8">
                {authError && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm font-mono">
                        Error: {authError}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {apps.map((app, idx) => (
                    <div key={idx} className="bg-black/50 backdrop-blur-sm border border-white/10 p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 group hover:border-white/30 transition-all duration-300 relative overflow-hidden">

                        {/* Active Indicator Glow */}
                        {app.connected && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                        )}

                        <div className="flex items-center gap-5 relative z-10 flex-1">
                            <div className={`w-12 h-12 flex items-center justify-center border transition-colors duration-300 flex-shrink-0 rounded-sm ${app.connected ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-zinc-900 border-white/5'}`}>
                                <app.icon className={`w-5 h-5 transition-colors duration-300 ${app.connected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-3 tracking-wide">
                                    {app.name}
                                    {app.connected && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/20 font-mono uppercase tracking-wider rounded-sm">Active</span>}
                                </h3>
                                <p className="text-zinc-500 text-xs font-mono mt-0.5">{app.desc}</p>
                                {/* Rendering status inline or absolute to prevent layout shift if desired, but min-h should cover it mostly */}
                                <div className={`overflow-hidden transition-all duration-300 ${app.connected ? 'max-h-6 mt-1.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="text-[10px] text-emerald-500/70 font-mono flex items-center gap-1"><Check className="w-3 h-3" /> {app.lastSync}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleConnection(idx)}
                            disabled={isLoading && app.id === 'gcal'}
                            className={`relative z-10 w-full md:w-32 py-3 text-xs font-bold uppercase tracking-wider border transition-all duration-300 flex-shrink-0 flex items-center justify-center ${app.connected
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                : 'border-white/20 text-white hover:bg-white hover:text-black hover:border-white'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isLoading && app.id === 'gcal' ? (
                                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /></span>
                            ) : (
                                app.connected ? 'Connected' : 'Connect'
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Integrations;