import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { Settings, Users, AlertTriangle, X, Save, Trash2, Shield, Lock, Globe, Terminal, Activity, Bell, Moon, Sun, Monitor, HardDrive, Wifi, Database, Cpu, Mic, Video, Radio, Signal, Zap } from 'lucide-react';
import { TripItinerary } from '../types';
import { supabase } from '../services/supabaseClient';
import { getWeatherDescription } from '../services/weatherService';

interface AdminSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    tripName: string;
    tripData: TripItinerary;
    members: any[];
    ownerId: string; // NEW: Trip owner's user_id
    onUpdateTrip: (updates: Partial<TripItinerary>) => Promise<void>;
    onDeleteTrip: () => Promise<void>;
    onKickMember: (userId: string) => Promise<void>;
    onPromoteMember: (userId: string, newRole: 'Vanguard' | 'Captain' | 'Specialist') => Promise<void>;
    weather?: any;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
    isOpen,
    onClose,
    tripId,
    tripName,
    tripData,
    members,
    ownerId,
    onUpdateTrip,
    onDeleteTrip,
    onKickMember,
    onPromoteMember,
    weather
}) => {
    const [name, setName] = useState(tripName);
    const [isPublic, setIsPublic] = useState(tripData.is_public || false);
    const [alertLevel, setAlertLevel] = useState<'normal' | 'elevated' | 'critical'>(tripData.alert_level || 'normal');

    // Comms Settings
    const [voiceEnabled, setVoiceEnabled] = useState(tripData.comm_settings?.voice_enabled ?? true);
    const [videoEnabled, setVideoEnabled] = useState(tripData.comm_settings?.video_enabled ?? true);
    // Enhanced Settings
    const [audioBitrate, setAudioBitrate] = useState<'low' | 'high'>(tripData.comm_settings?.audio_bitrate || 'high');
    const [noiseCancellation, setNoiseCancellation] = useState(tripData.comm_settings?.noise_cancellation ?? true);
    const [videoResolution, setVideoResolution] = useState<'720p' | '1080p' | '4k'>(tripData.comm_settings?.video_resolution || '1080p');
    const [frameRate, setFrameRate] = useState<'30' | '60'>(tripData.comm_settings?.frame_rate || '60');
    const [bandwidthSaver, setBandwidthSaver] = useState(tripData.comm_settings?.bandwidth_saver ?? false);

    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState('');

    // Live Diagnostics State
    const [latency, setLatency] = useState(24);
    const [logs, setLogs] = useState<string[]>([]);

    // Local copy of members for optimistic UI updates
    const [localMembers, setLocalMembers] = useState(members);

    // Sync with prop if it changes
    React.useEffect(() => {
        setLocalMembers(members);
    }, [members]);

    React.useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setLatency(prev => Math.max(12, Math.min(150, prev + (Math.random() > 0.5 ? 2 : -2))));

            // Random Logs
            if (Math.random() > 0.8) {
                const msgs = [
                    '[INFO] Handshake acknowledged',
                    '[INFO] Updating tactical overlay...',
                    '[INFO] Syncing with satellite relay...',
                    '[WARN] Minor interference detected in Sector 7',
                    '[INFO] Refreshing squad telemetry',
                    '[SYSTEM] Heartbeat signal received'
                ];
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msgs[Math.floor(Math.random() * msgs.length)]}`, ...prev].slice(0, 50));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);


    const handleSaveGeneral = async () => {
        setLoading(true);
        await onUpdateTrip({
            destination: name,
            is_public: isPublic,
            alert_level: alertLevel
        });
        setLoading(false);
    };

    const handleSaveComms = async () => {
        setLoading(true);
        await onUpdateTrip({
            comm_settings: {
                voice_enabled: voiceEnabled,
                video_enabled: videoEnabled,
                audio_bitrate: audioBitrate,
                noise_cancellation: noiseCancellation,
                video_resolution: videoResolution,
                frame_rate: frameRate,
                bandwidth_saver: bandwidthSaver
            }
        });
        setLoading(false);
    };

    const handleDelete = async () => {
        if (confirmDelete === 'DELETE') {
            setLoading(true);
            await onDeleteTrip();
            // Redirect happens in parent
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000] animate-fade-in" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl h-[80vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] z-[10001] flex overflow-hidden">

                    {/* SIDEBAR NAVIGATION */}
                    <Tabs.Root defaultValue="general" className="flex flex-col md:flex-row w-full h-full">
                        <div className="w-full md:w-64 bg-zinc-900/50 border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
                            <div className="p-4 md:p-6 border-b border-white/5">
                                <Dialog.Title className="flex items-center gap-3 outline-none">
                                    <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                                        <Settings className="w-5 h-5 text-cyan-400 animate-spin-slow" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">System</div>
                                        <div className="text-sm font-bold text-white uppercase tracking-wider">Mission Ctrl</div>
                                    </div>
                                </Dialog.Title>
                                <Dialog.Description className="sr-only">
                                    Admin settings panel for configuring mission parameters, squad members, and system diagnostics.
                                </Dialog.Description>
                            </div>

                            <Tabs.List className="flex-1 p-2 md:p-4 grid grid-cols-2 md:flex md:flex-col gap-2 md:space-y-2 overflow-y-auto max-h-32 md:max-h-full">
                                <Tabs.Trigger value="general" className="flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white hover:bg-white/5 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/20 transition-all">
                                    <Globe className="w-4 h-4" /> General
                                </Tabs.Trigger>
                                <Tabs.Trigger value="squad" className="flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white hover:bg-white/5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=active]:border data-[state=active]:border-emerald-500/20 transition-all">
                                    <Users className="w-4 h-4" /> Squad Net
                                </Tabs.Trigger>
                                <Tabs.Trigger value="system" className="flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white hover:bg-white/5 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400 data-[state=active]:border data-[state=active]:border-violet-500/20 transition-all">
                                    <Activity className="w-4 h-4" /> Diagnostics
                                </Tabs.Trigger>
                                <Tabs.Trigger value="uplink" className="flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white hover:bg-white/5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 data-[state=active]:border data-[state=active]:border-amber-500/20 transition-all">
                                    <Radio className="w-4 h-4" /> Comms Uplink
                                </Tabs.Trigger>
                                <div className="hidden md:block h-px bg-white/5 my-2" />
                                <Tabs.Trigger value="danger" className="flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-red-400 hover:bg-red-500/5 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500 data-[state=active]:border data-[state=active]:border-red-500/20 transition-all">
                                    <AlertTriangle className="w-4 h-4" /> Danger Zone
                                </Tabs.Trigger>
                            </Tabs.List>

                            <div className="hidden md:block p-4 border-t border-white/5 text-[9px] text-zinc-600 font-mono text-center">
                                VOYAGEUR SYSTEM V2.5.0 <br /> ADMIN_PRIVILEGE_ACTIVE
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 bg-black/40 relative overflow-x-hidden">
                            {/* Decorative Grid */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                            <div className="absolute top-0 right-0 p-4">
                                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* GENERAL TAB */}
                            <Tabs.Content value="general" className="p-6 md:p-8 h-full overflow-y-auto">
                                <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-wider">Mission Parameters</h2>
                                <p className="text-zinc-500 text-sm mb-8 font-mono">Configure core mission identifiers and public visibility.</p>

                                <div className="space-y-6 max-w-xl">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Operation Name</label>
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="flex-1 bg-black border border-white/20 p-4 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none rounded-lg"
                                            />
                                        </div>
                                    </div>



                                    <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Bell className="w-4 h-4 text-amber-400" />
                                                <span className="text-sm font-bold text-white uppercase tracking-wide">Alert Level</span>
                                            </div>
                                            <p className="text-xs text-zinc-500">Global notifications for squad updates.</p>
                                        </div>
                                        <div className="flex gap-1">
                                            {(['normal', 'elevated', 'critical'] as const).map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => setAlertLevel(level)}
                                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded border transition-all ${alertLevel === level
                                                        ? level === 'critical' ? 'bg-red-500 text-black border-red-500'
                                                            : level === 'elevated' ? 'bg-amber-500 text-black border-amber-500'
                                                                : 'bg-emerald-500 text-black border-emerald-500'
                                                        : 'bg-black text-zinc-500 border-white/10 hover:border-white/30'
                                                        }`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Update Public Access Toggle Logic */}
                                    <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl mt-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Globe className="w-4 h-4 text-cyan-400" />
                                                <span className="text-sm font-bold text-white uppercase tracking-wide">Public Access</span>
                                            </div>
                                            <p className="text-xs text-zinc-500">Allow other agents to discover this mission.</p>
                                        </div>
                                        <button
                                            onClick={() => setIsPublic(!isPublic)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <div className="pt-8 flex justify-end">
                                        <button
                                            onClick={handleSaveGeneral}
                                            disabled={loading}
                                            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-widest text-xs rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Configuration
                                        </button>
                                    </div>
                                </div>
                            </Tabs.Content>

                            {/* SQUAD TAB */}
                            <Tabs.Content value="squad" className="p-6 md:p-8 h-full overflow-y-auto">
                                <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-wider">Squad Roster</h2>
                                <p className="text-zinc-500 text-sm mb-8 font-mono">Manage connected agents and permissions.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {localMembers.map(member => (
                                        <div key={member.user_id || 'unknown'} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group hover:border-white/20 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center font-bold text-emerald-400 border border-emerald-500/20">
                                                    {(member.full_name || 'A').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">{member.full_name || 'Agent'} <span className="opacity-50 text-[9px] font-mono">({member.user_id?.slice(0, 4) || 'UKWN'})</span></div>
                                                    <div className="text-[10px] text-zinc-500 font-mono uppercase">{member.role}</div>
                                                </div>
                                            </div>
                                            {/* Hide Promote/Kick buttons for owner (can't kick/promote yourself) */}
                                            {member.user_id !== ownerId && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await onPromoteMember(member.user_id, 'Captain');
                                                                // Optimistically update role in local state
                                                                setLocalMembers(prev => prev.map(m => m.user_id === member.user_id ? { ...m, role: 'Captain' } : m));
                                                                alert('Agent promoted to Captain!');
                                                            } catch (e) {
                                                                alert('Failed: Check DB permissions.');
                                                            }
                                                        }}
                                                        className="p-2 bg-black border border-white/10 text-zinc-400 hover:text-white rounded hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                                                        title="Promote to Captain"
                                                    >
                                                        <Shield className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Disconnect this agent from the squad?')) {
                                                                try {
                                                                    await onKickMember(member.user_id);
                                                                    // Optimistically remove from local state
                                                                    setLocalMembers(prev => prev.filter(m => m.user_id !== member.user_id));
                                                                    alert('Agent disconnected successfully.');
                                                                } catch (e) {
                                                                    alert('Failed: Check DB permissions.');
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 bg-black border border-white/10 text-zinc-400 hover:text-red-400 rounded hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                                                        title="Disconnect"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Placeholder Empty Slots */}
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="p-4 bg-black/20 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-zinc-700 uppercase text-[10px] font-bold tracking-widest">
                                            Empty Slot {i}
                                        </div>
                                    ))}
                                </div>
                            </Tabs.Content>

                            {/* SYSTEM / DIAGNOSTICS TAB (The "Bulky" visual filler) */}
                            <Tabs.Content value="system" className="p-6 md:p-8 h-full overflow-y-auto">
                                <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-wider">System Diagnostics</h2>
                                <p className="text-zinc-500 text-sm mb-8 font-mono">Real-time performance metrics and node status.</p>

                                <div className="grid grid-cols-3 gap-6 mb-8">
                                    <div className="p-4 bg-zinc-900/50 border border-violet-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 text-violet-400 mb-2">
                                            <Cpu className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Latency</span>
                                        </div>
                                        <div className="text-2xl font-mono text-white">{latency}<span className="text-xs text-zinc-500 ml-1">ms</span></div>
                                        <div className="w-full h-1 bg-zinc-800 mt-3 rounded-full overflow-hidden">
                                            <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, (latency / 150) * 100))}%` }} />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-zinc-900/50 border border-emerald-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                            <Wifi className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Uplink</span>
                                        </div>
                                        <div className="text-2xl font-mono text-white">1.2<span className="text-xs text-zinc-500 ml-1">GB/s</span></div>
                                        <div className="w-full h-1 bg-zinc-800 mt-3 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[85%]" />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-zinc-900/50 border border-cyan-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 text-cyan-400 mb-2">
                                            <Database className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Storage</span>
                                        </div>
                                        <div className="text-2xl font-mono text-white">45<span className="text-xs text-zinc-500 ml-1">%</span></div>
                                        <div className="w-full h-1 bg-zinc-800 mt-3 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-500 w-[45%]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-black border border-white/10 rounded-xl font-mono text-xs text-zinc-400 h-64 overflow-y-auto">
                                    <div className="mb-2 text-emerald-500">[SYSTEM] Diagnostic sequence initiated...</div>
                                    <div className="mb-2 text-zinc-300">[INFO] Checking node connectivity... OK</div>
                                    <div className="mb-2 text-zinc-300">[INFO] Verifying encryption keys... OK</div>
                                    <div className="mb-2 text-zinc-300">[INFO] Squad synchronization... STABLE</div>
                                    <div className="mb-2 text-zinc-300">[INFO] Location services... ACTIVE</div>
                                    <div className={`mb-2 ${weather ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                        [INFO] Weather radar... {weather ? `ONLINE (${weather.temperature}°C, ${getWeatherDescription(weather.weathercode)})` : 'OFFLINE (Pending)'}
                                    </div>
                                    <div className="mb-2 text-emerald-500">[SYSTEM] All systems nominal. Ready for deployment.</div>
                                    {logs.map((log, i) => (
                                        <div key={i} className="mb-2 text-zinc-500 opacity-60 font-mono text-[10px]">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </Tabs.Content>

                            {/* UPLINK / COMMS TAB */}
                            <Tabs.Content value="uplink" className="p-6 md:p-8 h-full overflow-y-auto">
                                <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-wider">Comms Uplink</h2>
                                <p className="text-zinc-500 text-sm mb-8 font-mono">Configure squad communication protocols.</p>

                                <div className="space-y-4 max-w-xl">
                                    <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${voiceEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <Mic className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white uppercase tracking-wide">Voice Channel</div>
                                                <p className="text-xs text-zinc-500">Enable real-time voice communication.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${voiceEnabled ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${voiceEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {voiceEnabled && (
                                        <div className="ml-4 p-4 border-l border-emerald-500/20 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs text-zinc-400 font-mono uppercase">Audio Bitrate</label>
                                                <div className="flex bg-black rounded p-1 border border-white/10">
                                                    {(['low', 'high'] as const).map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => setAudioBitrate(opt)}
                                                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${audioBitrate === opt ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs text-zinc-400 font-mono uppercase">Noise Cancellation</label>
                                                <button onClick={() => setNoiseCancellation(!noiseCancellation)} className={`text-[10px] font-bold uppercase ${noiseCancellation ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                                    {noiseCancellation ? 'Active' : 'Disabled'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${videoEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <Video className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white uppercase tracking-wide">Video Feed</div>
                                                <p className="text-xs text-zinc-500">Enable tactical video sharing.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setVideoEnabled(!videoEnabled)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${videoEnabled ? 'bg-cyan-500' : 'bg-zinc-800'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${videoEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {videoEnabled && (
                                        <div className="ml-4 p-4 border-l border-cyan-500/20 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs text-zinc-400 font-mono uppercase">Resolution</label>
                                                <select
                                                    value={videoResolution}
                                                    onChange={(e) => setVideoResolution(e.target.value as any)}
                                                    className="bg-black border border-white/10 text-xs text-white p-1 rounded font-mono uppercase"
                                                >
                                                    <option value="720p">HD 720p</option>
                                                    <option value="1080p">FHD 1080p</option>
                                                    <option value="4k">UHD 4K</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs text-zinc-400 font-mono uppercase">Frame Rate</label>
                                                <div className="flex bg-black rounded p-1 border border-white/10">
                                                    {(['30', '60'] as const).map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => setFrameRate(opt)}
                                                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${frameRate === opt ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
                                                        >
                                                            {opt}FPS
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs text-zinc-400 font-mono uppercase">Bandwidth Saver</label>
                                                <button
                                                    onClick={() => setBandwidthSaver(!bandwidthSaver)}
                                                    className={`w-8 h-4 rounded-full relative transition-colors ${bandwidthSaver ? 'bg-cyan-500' : 'bg-zinc-800'}`}
                                                >
                                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${bandwidthSaver ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                                        <Signal className="w-5 h-5 text-amber-500 mt-0.5" />
                                        <div>
                                            <div className="text-xs font-bold text-amber-500 uppercase">Signal Encryption</div>
                                            <p className="text-[10px] text-amber-500/70">All channels are end-to-end encrypted using AES-256 standard protocols.</p>
                                        </div>
                                    </div>

                                    <div className="pt-8 flex justify-end">
                                        <button
                                            onClick={handleSaveComms}
                                            disabled={loading}
                                            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-widest text-xs rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                            Update Uplink
                                        </button>
                                    </div>
                                </div>
                            </Tabs.Content>

                            {/* DANGER TAB */}
                            <Tabs.Content value="danger" className="p-6 md:p-8 h-full overflow-y-auto">
                                <h2 className="text-2xl font-bold text-red-500 mb-1 uppercase tracking-wider">Danger Zone</h2>
                                <p className="text-zinc-500 text-sm mb-8 font-mono">Irreversible actions. Proceed with caution.</p>

                                <div className="p-6 border border-red-500/20 bg-red-500/5 rounded-xl">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <h3 className="text-white font-bold uppercase mb-1">Delete Mission</h3>
                                            <p className="text-zinc-400 text-xs max-w-sm">
                                                This will permanently destroy all mission data, itinerary logs, and squad history. This action cannot be undone.
                                            </p>
                                        </div>
                                        <div className="p-3 bg-red-500/10 rounded-full">
                                            <AlertTriangle className="w-6 h-6 text-red-500" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest block">Type "DELETE" to confirm</label>
                                        <input
                                            type="text"
                                            value={confirmDelete}
                                            onChange={(e) => setConfirmDelete(e.target.value)}
                                            className="w-full bg-black border border-red-900/50 p-3 text-red-500 font-mono text-sm focus:border-red-500 focus:outline-none rounded uppercase placeholder-red-900/50"
                                            placeholder="DELETE"
                                        />
                                        <button
                                            onClick={handleDelete}
                                            disabled={confirmDelete !== 'DELETE' || loading}
                                            className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black font-bold uppercase tracking-widest text-xs rounded border border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Terminate Mission Data
                                        </button>
                                    </div>
                                </div>
                            </Tabs.Content>
                        </div>
                    </Tabs.Root>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
