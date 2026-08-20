import React, { useState } from 'react';
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, SignalHigh, Settings, X, ChevronDown, Check, Video, VideoOff } from 'lucide-react';

interface VoiceControlsProps {
    isConnected: boolean;
    isConnecting?: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    isVideoEnabled: boolean;
    onToggleMute: () => void;
    onToggleDeafen: () => void;
    onToggleVideo: () => void;
    onDisconnect: () => void;
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    selectedInput: string;
    selectedVideoInput: string;
    onSelectInput: (id: string) => void;
    onSelectVideoInput: (id: string) => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
    isConnected,
    isConnecting,
    isMuted,
    isDeafened,
    isVideoEnabled,
    onToggleMute,
    onToggleDeafen,
    onToggleVideo,
    onDisconnect,
    audioInputs,
    videoInputs,
    selectedInput,
    selectedVideoInput,
    onSelectInput,
    onSelectVideoInput
}) => {
    const [showSettings, setShowSettings] = useState(false);

    if (!isConnected && !isConnecting) return null;

    // Show connecting state
    if (isConnecting && !isConnected) {
        return (
            <div className="w-full bg-zinc-950/90 border border-white/5 p-3 flex flex-col gap-2 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 text-amber-500">
                    <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Connecting...</span>
                </div>
                <span className="text-[8px] text-zinc-500 font-mono uppercase">REQUESTING_MEDIA_ACCESS</span>
            </div>
        );
    }

    return (
        <div className="w-full bg-zinc-950/90 border border-white/5 p-3 flex flex-col gap-2 rounded-xl animate-in slide-in-from-bottom-2 duration-300 relative">
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-emerald-500">
                        <SignalHigh className="w-3 h-3 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Voice Connected</span>
                    </div>
                    <span className="text-[8px] text-zinc-500 font-mono uppercase">VANGUARD_SECURE_CHANNEL</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-1.5 rounded-sm transition-all ${showSettings ? 'bg-emerald-500 text-black' : 'hover:bg-white/5 text-zinc-400'}`}
                        title="Audio Settings"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onDisconnect}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-sm transition-all"
                        title="Disconnect"
                    >
                        <PhoneOff className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg">
                <button
                    onClick={onToggleMute}
                    className={`flex-1 flex items-center justify-center py-2 rounded transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/5 text-zinc-400'}`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                    onClick={onToggleDeafen}
                    className={`flex-1 flex items-center justify-center py-2 rounded transition-all ${isDeafened ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/5 text-zinc-400'}`}
                    title={isDeafened ? 'Undeafen' : 'Deafen'}
                >
                    {isDeafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                </button>
                <button
                    onClick={onToggleVideo}
                    className={`flex-1 flex items-center justify-center py-2 rounded transition-all ${!isVideoEnabled ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/5 text-zinc-400'}`}
                    title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
                >
                    {!isVideoEnabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
            </div>

            {/* SETTINGS OVERLAY */}
            {showSettings && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-950 border border-emerald-500/30 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Hardware Settings</span>
                        <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                            <X className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Input Device</label>
                            <select
                                value={selectedInput}
                                onChange={(e) => onSelectInput(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-emerald-500/50"
                            >
                                {audioInputs.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                                    </option>
                                ))}
                            </select>
                        </div>



                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Video Input</label>

                            <select
                                value={selectedVideoInput}
                                onChange={(e) => onSelectVideoInput(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-emerald-500/50"
                            >
                                {videoInputs.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
