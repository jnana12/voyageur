import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Plus, Zap, Battery, Shield, Ghost, MessageSquare, Send, X, RefreshCw, Key, Vote, CheckCircle2, ShieldCheck, Copy, Check, UserPlus, Video } from 'lucide-react';
import { SquadMember, MissionMessage, MissionPoll } from '../types';
import { PresencePayload, presenceService } from '../services/presenceService';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { VoiceControls } from './VoiceControls';
import { Volume2, VolumeX } from 'lucide-react';

// --- VIDEO COMPONENT ---
const VideoFeed = ({ stream, label, isLocal }: { stream: MediaStream | null, label: string, isLocal?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) return null;

    return (
        <div className="relative group bg-black rounded-lg overflow-hidden border border-white/10 aspect-video shadow-lg">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={true} // ALWAYS mute video element. Audio is handled by useVoiceChat's Audio() objects which support setSinkId.
                className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} // Mirror local
            />
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-bold text-white uppercase tracking-wider">
                {label}
            </div>
            {isLocal && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            )}
        </div>
    );
};

interface SquadSidebarProps {
    members: SquadMember[];
    presence: Record<string, PresencePayload>;
    messages: MissionMessage[];
    polls: MissionPoll[];
    votes: Record<string, Record<string, number>>;
    userVotes: Record<string, string>;
    currentUser: any;
    missionCode: string | null;
    rawMessages: MissionMessage[];
    onInviteClick: () => void;
    onSendMessage: (text: string) => void;
    onCreatePoll: (question: string, options: string[]) => void;
    onCastVote: (pollId: string, optionId: string) => void;
    onRefreshCode: () => void;
    onRefreshSquad: () => void;
}

export const SquadSidebar: React.FC<SquadSidebarProps> = ({
    members,
    presence,
    messages,
    polls,
    votes,
    userVotes,
    currentUser,
    missionCode,
    onInviteClick,
    onSendMessage,
    onCreatePoll,
    onCastVote,
    onRefreshCode,
    onRefreshSquad,
    rawMessages
}) => {
    // 1. Voice Chat Logic
    const {
        isConnected,
        isConnecting,
        isMuted,
        isDeafened,
        voiceMembers,
        audioInputs,
        videoInputs,
        isVideoEnabled,
        selectedInput,
        selectedVideoInput,
        setSelectedInput,
        setSelectedVideoInput,
        toggleConnection,
        toggleVideo,
        toggleMute,
        toggleDeafen,
        localStream,
        remoteStreams,
        remoteVideoTrigger
    } = useVoiceChat(currentUser, missionCode || undefined, onSendMessage, rawMessages);

    // Filter for active video streams
    const activeVideoStreams = React.useMemo(() => {
        const streams: { id: string, stream: MediaStream, label: string }[] = [];
        // Add Local
        if (localStream && isVideoEnabled) {
            // Only add if it has active video tracks
            if (localStream.getVideoTracks().some(t => t.readyState === 'live')) {
                streams.push({ id: 'local', stream: localStream, label: 'Me' });
            }
        }
        // Add Remote
        if (remoteStreams) {
            Object.entries(remoteStreams).forEach(([uid, stream]) => {
                // Check for LIVE and UNMUTED video tracks
                // If the track is "ended" or "muted" (which happens when stopped), don't show it
                if (stream.getVideoTracks().some(t => t.readyState === 'live' && !t.muted)) {
                    const member = members.find(m => m.user_id === uid);
                    const name = member?.full_name || uid.slice(0, 5);
                    streams.push({ id: uid, stream, label: name });
                }
            });
        }
        return streams;
    }, [localStream, isVideoEnabled, remoteStreams, remoteVideoTrigger, members]);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isPollsOpen, setIsPollsOpen] = useState(false);
    const [showProtocol, setShowProtocol] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [showPollForm, setShowPollForm] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [copied, setCopied] = useState(false);
    const [lastReadCount, setLastReadCount] = useState(messages.length);
    const [activeMemberPopup, setActiveMemberPopup] = useState<string | null>(null);
    const [syncState, setSyncState] = useState({ status: presenceService.lastSyncStatus, time: presenceService.lastSyncTime });
    const scrollRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Sync Diagnostic State
    useEffect(() => {
        const interval = setInterval(() => {
            setSyncState({
                status: presenceService.lastSyncStatus,
                time: presenceService.lastSyncTime
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Derive unread count
    const unreadCount = Math.max(0, messages.length - lastReadCount);

    // Reset unread count when chat is opened
    useEffect(() => {
        if (isChatOpen) {
            setLastReadCount(messages.length);
        }
    }, [isChatOpen, messages.length]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Check if click is outside sidebar AND outside the portal popup
            const isOutsideSidebar = sidebarRef.current && !sidebarRef.current.contains(target);
            const isOutsidePopup = !document.querySelector('.member-popup-content')?.contains(target);

            if (isOutsideSidebar && isOutsidePopup) {
                setIsChatOpen(false);
                setIsPollsOpen(false);
                setShowProtocol(false);
                setActiveMemberPopup(null);
            }
        };

        if (isChatOpen || isPollsOpen || showProtocol || activeMemberPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isChatOpen, isPollsOpen, showProtocol, activeMemberPopup]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isChatOpen]);

    const handleSend = () => {
        if (messageInput.trim()) {
            onSendMessage(messageInput);
            setMessageInput('');
        }
    };

    const handleCreatePoll = () => {
        const validOptions = pollOptions.filter(o => o.trim());
        if (pollQuestion.trim() && validOptions.length >= 2) {
            onCreatePoll(pollQuestion, validOptions);
            setPollQuestion('');
            setPollOptions(['', '']);
            setShowPollForm(false);
        }
    };

    const addPollOption = () => {
        if (pollOptions.length < 4) {
            setPollOptions([...pollOptions, '']);
        }
    };

    const updatePollOption = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const sortedMembers = React.useMemo(() => {
        return [...members].sort((a, b) => {
            // 1. Current User Priority
            const isMeA = currentUser && a.user_id === currentUser.id;
            const isMeB = currentUser && b.user_id === currentUser.id;
            if (isMeA) return -1;
            if (isMeB) return 1;

            // 2. Online Status Priority (Online first)
            const statusA = presence[a.user_id];
            const statusB = presence[b.user_id];
            const isStaleA = statusA ? (Date.now() - new Date(statusA.last_seen!).getTime() > 60000) : true; // Treat missing status as stale/offline
            const isStaleB = statusB ? (Date.now() - new Date(statusB.last_seen!).getTime() > 60000) : true;            // Treat missing status as stale/offline
            // DEBUG LOGS
            if (statusA) console.log(`Member ${a.user_id} Status:`, statusA, "Diff:", Date.now() - new Date(statusA.last_seen!).getTime());

            if (!isStaleA && isStaleB) return -1;
            if (isStaleA && !isStaleB) return 1;

            return 0;
        });
    }, [members, currentUser, presence]);

    // Debug active presence count
    console.log("SquadSidebar: Render. Total Members:", members.length, "Active Presence Keys:", Object.keys(presence).length);

    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());


    return (
        <div ref={sidebarRef} className="fixed left-0 top-1/2 -translate-y-1/2 z-[1002] flex items-stretch h-fit max-h-[90vh]">
            {/* STATIC SIDEBAR STRIP */}
            <div className="flex flex-col items-center gap-0 p-3 bg-zinc-950/90 backdrop-blur-3xl border-y border-r border-emerald-500/30 rounded-r-[2rem] shadow-[20px_0_80px_rgba(0,0,0,0.9)] w-20 relative z-[20]">
                {/* Scanline Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(0deg,transparent_0%,rgba(52,211,153,0.2)_50%,transparent_100%)] bg-[length:100%_4px] animate-[scanline_8s_linear_infinite] rounded-r-[2rem] overflow-hidden" />

                {/* HEADER: SQUAD COUNT & REFRESH */}
                <div className="flex flex-col items-center gap-2 py-6 border-b border-white/10 w-full relative z-10">
                    <button
                        onClick={onRefreshSquad}
                        className="absolute right-0 top-0 p-1 opacity-10 hover:opacity-100 transition-opacity"
                        title="Force Sync"
                    >
                        <RefreshCw className="w-3 h-3 text-emerald-500" />
                    </button>
                    <span className="text-[6px] font-black text-emerald-500/40 uppercase tracking-[0.2em]">SQUAD_NET</span>
                    <div className="text-[14px] font-mono font-black text-emerald-400 leading-none mt-1">
                        {members.length.toString().padStart(2, '0')}
                    </div>
                </div>

                {/* VOICE CHANNEL: DISCORD STYLE */}
                <div className="w-full py-4 border-b border-white/10 relative group/voice">
                    <button
                        onClick={toggleConnection}
                        className={`w-10 h-10 mx-auto rounded-sm border flex items-center justify-center transition-all ${isConnected ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse' : 'bg-zinc-900 border-white/10 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/50'}`}
                        title={isConnected ? 'Disconnect from Voice' : 'Join Voice Channel'}
                    >
                        <Volume2 className="w-5 h-5" />
                    </button>

                    {/* Active Voice Roster Tooltip - ABSOLUTE POSITIONING */}
                    <div className="absolute left-20 top-0 px-4 py-3 bg-zinc-950 border border-white/10 rounded-sm opacity-0 group-hover/voice:opacity-100 transition-all pointer-events-none z-[10000] shadow-2xl translate-x-3 group-hover/voice:translate-x-0 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">TACTICAL_AUDIO_NET</span>
                            <div className="space-y-1.5 mt-1">
                                {Object.keys(voiceMembers).length === 0 ? (
                                    <span className="text-[10px] text-zinc-600 uppercase italic">Channel Empty</span>
                                ) : (
                                    Object.keys(voiceMembers).map(mid => {
                                        const m = members.find(sm => sm.user_id === mid);
                                        return (
                                            <div key={mid} className="flex items-center gap-2 text-[10px] font-bold text-white uppercase">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                {m?.full_name || 'Agent'}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROSTER: SCROLLABLE LIST */}
                <div className="flex-1 w-full py-2 px-2 space-y-4 overflow-y-auto hide-scrollbar min-h-[100px]">
                    <div className="flex flex-col items-center gap-4">
                        {sortedMembers.map((member) => {
                            const status = presence[member.user_id] as any; // Cast to access new optional props

                            // FORCE current user or voice users to be online (never stale)
                            const isMe = currentUser && member.user_id === currentUser.id;
                            const isVoiceActive = !!voiceMembers[member.user_id];

                            let isStale = true;

                            if (isMe || isVoiceActive) {
                                isStale = false;
                            } else if (status) {
                                // 1. Prefer explicit "is_online" flag if available (New Robust Logic)
                                if (typeof status.is_online === 'boolean') {
                                    isStale = !status.is_online;
                                }
                                // 2. Fallback to Timestamp (Legacy / Network lag safety)
                                else if (status.last_seen) {
                                    const diff = Date.now() - new Date(status.last_seen).getTime();
                                    isStale = diff > 60000; // Stricter 1 min threshold
                                }
                            }

                            const isAdmin = member.role === 'Captain' || member.role === 'Admin';
                            const initials = (member.full_name || 'V').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                            const hasFailedImage = failedImages.has(member.user_id);

                            // Admin might have avatar_url set purely on the profile (from useSquadSync), OR in currentUser
                            const rawAvatarUrl = member.avatar_url || (isMe && currentUser?.avatarUrl) || null;
                            const isValidAvatar = typeof rawAvatarUrl === 'string' && rawAvatarUrl.trim() !== '' && rawAvatarUrl !== 'null' && rawAvatarUrl !== 'undefined';

                            return (
                                <div key={member.user_id} className="relative group/avatar">
                                    <button
                                        onClick={(e) => {
                                            console.log("SquadSidebar: Avatar Clicked", member.user_id, "Current Popup:", activeMemberPopup);
                                            e.stopPropagation();
                                            setActiveMemberPopup(activeMemberPopup === member.user_id ? null : member.user_id);
                                        }}
                                        className={`w-10 h-10 rounded-sm border flex items-center justify-center transition-all duration-300 relative hover:scale-105 active:scale-95 z-[1002] 
                                            ${isAdmin
                                                ? 'border-orange-500/80 bg-orange-500/20 shadow-[0_0_25px_rgba(249,115,22,0.4)]'
                                                : (member as any).isGhost
                                                    ? 'border-cyan-500/50 bg-cyan-500/10 border-dashed animate-pulse' // Ghost styling
                                                    : isStale
                                                        ? 'border-white/10 bg-zinc-800/50' // Offline styling
                                                        : 'border-emerald-500/80 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                                            } 
                                             ${activeMemberPopup === member.user_id ? 'ring-2 ring-emerald-500' : ''}
                                             ${voiceMembers[member.user_id] ? 'ring-2 ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : ''}
                                         `}
                                    >
                                        {isValidAvatar && !hasFailedImage ? (
                                            <img
                                                src={rawAvatarUrl as string}
                                                alt={member.full_name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    // Silently fallback to initials on network failure
                                                    setFailedImages(prev => new Set(prev).add(member.user_id));
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full text-xs font-bold text-white uppercase tracking-wider">
                                                {typeof member.full_name === 'string' ? initials : 'AG'}
                                            </div>
                                        )}

                                        {/* Status Indicator Dot */}
                                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${isStale ? 'bg-zinc-500' : 'bg-green-500 animate-pulse'}`}></div>

                                        {/* Voice Active Indicator */}
                                        {voiceMembers[member.user_id] && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                            </div>
                                        )}
                                    </button>

                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ACTIVE MEMBER POPUP - RENDERED VIA PORTAL TO ESCAPE STACKING CONTEXTS */}
                {activeMemberPopup && (() => {
                    const member = members.find(m => m.user_id === activeMemberPopup);
                    if (!member) return null;

                    const status = presence[member.user_id];
                    const isMe = currentUser && member.user_id === currentUser.id;
                    const isVoiceActive = !!voiceMembers[member.user_id];
                    const isStalePayload = status ? (Date.now() - new Date(status.last_seen!).getTime() > 45000) : true;
                    const isStale = isStalePayload;
                    const isAdmin = member.role === 'Captain' || member.role === 'Admin';

                    // Always render to body via Portal
                    return createPortal(
                        <div className="member-popup-content fixed left-20 top-1/2 -translate-y-1/2 px-6 py-5 bg-zinc-950/98 backdrop-blur-3xl border border-emerald-500/30 rounded-xl transition-all duration-300 whitespace-nowrap z-[10050] shadow-[30px_0_100px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-left-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-10 border-b border-white/10 pb-2 mb-1">
                                    <div className="flex flex-col">
                                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isAdmin ? 'text-orange-500' : 'text-emerald-400'}`}>
                                            {isAdmin ? 'PRIME_COMMAND' : 'TACTICAL_SPEC'}
                                        </span>
                                        <span className="text-sm font-bold text-white uppercase mt-0.5">{member.full_name || 'UNKNOWN_VANGUARD'}</span>
                                    </div>
                                    <button onClick={() => setActiveMemberPopup(null)} className="p-1 hover:bg-white/10 rounded-full text-zinc-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-6 py-1">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Signal</span>
                                        <div className={`text-xs font-mono font-black uppercase tracking-tighter ${isStale ? 'text-zinc-500' : 'text-emerald-400'}`}>
                                            {isStale ? 'SIGNAL LOST' : 'SECURE_LINK'}
                                        </div>
                                    </div>
                                </div>

                                {/* DEBUG INFO FOR MYSELF */}
                                {isMe && (
                                    <div className="mt-2 pt-2 border-t border-white/10 bg-black/40 -mx-6 -mb-5 px-6 py-3 rounded-b-xl">
                                        <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">UPLINK DIAGNOSTICS</div>
                                        <div className="text-[10px] font-mono text-zinc-300 flex flex-col gap-0.5">
                                            <div className="flex justify-between gap-4">
                                                <span>STATUS:</span>
                                                <span className={syncState.status === 'Success' ? 'text-emerald-500' : 'text-red-500'}>{syncState.status}</span>
                                            </div>
                                            <div className="flex justify-between text-zinc-500">
                                                <span>LAST PING:</span>
                                                <span>{syncState.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>,
                        document.body
                    );
                })()}
                {/* BOTTOM TOOLS */}
                <div className="flex flex-col items-center gap-6 py-6 border-t border-white/10 w-full bg-black/40 relative z-10">
                    <button
                        onClick={() => setIsPollsOpen(!isPollsOpen)}
                        className={`w-10 h-10 rounded-sm border flex items-center justify-center relative ${isPollsOpen ? 'bg-amber-500 text-black' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                        title="Tactical Voting"
                    >
                        <Vote className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`w-10 h-10 rounded-sm border flex items-center justify-center relative ${isChatOpen ? 'bg-emerald-500 text-black' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                        title="Squad Comms"
                    >
                        <MessageSquare className="w-4 h-4" />
                        {unreadCount > 0 && !isChatOpen && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-sm text-[8px] font-black text-white flex items-center justify-center border border-zinc-950">
                                {unreadCount}
                            </div>
                        )}
                    </button>


                    <div className="relative group/code">
                        <button
                            onClick={() => setShowProtocol(!showProtocol)}
                            className={`w-10 h-10 rounded-sm border flex items-center justify-center ${showProtocol ? 'bg-emerald-500 text-black' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                            title="Squad Invite"
                        >
                            <UserPlus className="w-5 h-5" />
                        </button>
                        <div className={`absolute left-20 top-1/2 -translate-y-1/2 px-4 py-3 bg-zinc-950 border border-emerald-500/30 text-white rounded-sm transition-all shadow-2xl z-[10001] ${showProtocol ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3 pointer-events-none'}`}>
                            {/* Mission Code Tooltip Content */}
                            <div className="flex flex-col gap-1 whitespace-nowrap">
                                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Deploy Link</span>
                                <span className="text-xl font-mono font-black text-white">{missionCode || '----'}</span>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => {
                                            if (missionCode) {
                                                navigator.clipboard.writeText(missionCode);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }
                                        }}
                                        className={`flex-1 text-[8px] uppercase border border-white/10 py-1 px-3 rounded transition-all duration-300 ${copied ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        {copied ? 'CODE_COPIED' : 'COPY_CODE'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            onInviteClick();
                                            setShowProtocol(false);
                                        }}
                                        className="text-[8px] uppercase border border-white/10 py-1 px-3 rounded text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        FULL_UI
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* VIDEO GRID OVERLAY */}
            {/* Show if we have active video streams and are connected */}
            {isConnected && activeVideoStreams.length > 0 && (
                <div className="absolute left-20 bottom-32 flex flex-col items-start gap-2 z-[9998] pointer-events-auto">
                    <div className="flex gap-2 p-2 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-xl overflow-x-auto max-w-[80vw]">
                        {activeVideoStreams.map(s => (
                            <div key={s.id} className="w-48 h-32 flex-shrink-0">
                                <VideoFeed stream={s.stream} label={s.label} isLocal={s.id === 'local'} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FLOATING PANELS */}
            <div className="absolute left-20 bottom-0 flex flex-col-reverse items-start gap-4 z-[9999]">
                {/* DISCORD-STYLE VOICE CONTROLS - FLOATING ABOVE BASE */}
                <div className="w-64">
                    <VoiceControls
                        isConnected={isConnected}
                        isConnecting={isConnecting}
                        isMuted={isMuted}
                        isDeafened={isDeafened}
                        isVideoEnabled={isVideoEnabled}
                        onToggleMute={toggleMute}
                        onToggleDeafen={toggleDeafen}
                        onToggleVideo={toggleVideo}
                        onDisconnect={toggleConnection}
                        audioInputs={audioInputs}
                        videoInputs={videoInputs}
                        selectedInput={selectedInput}
                        selectedVideoInput={selectedVideoInput}
                        onSelectInput={setSelectedInput}
                        onSelectVideoInput={setSelectedVideoInput}
                    />
                </div>
                {/* CHAT PANEL */}
                {isChatOpen && (
                    <div className="w-[85vw] md:w-96 max-h-[60vh] bg-zinc-950/98 backdrop-blur-3xl border-y border-r border-white/10 rounded-r-xl shadow-[40px_0_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-300">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-emerald-500/5">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Squad Comms</h3>
                            <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
                        </div>
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
                        >
                            {messages.map((msg) => {
                                const sender = members.find(m => m.user_id === msg.user_id);
                                const senderName = sender?.full_name || 'Agent';
                                const isOwnMessage = msg.user_id === currentUser?.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                        {/* Sender Name - only show for others' messages */}
                                        {!isOwnMessage && (
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase mb-0.5 ml-1">{senderName}</span>
                                        )}
                                        <div className={`max-w-[85%] px-4 py-2 rounded-lg text-xs ${isOwnMessage ? 'bg-emerald-500 text-black font-medium' : 'bg-white/5 text-zinc-300 border border-white/10'}`}>
                                            {msg.message}
                                        </div>
                                        {/* Timestamp */}
                                        <span className="text-[8px] text-zinc-600 mt-0.5 mx-1">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 bg-black/40 border-t border-white/5">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500/50 outline-none"
                                    placeholder="TYPE MESSAGE..."
                                />
                                <button onClick={handleSend} className="p-2 bg-emerald-500 text-black rounded hover:bg-emerald-400 transition-colors"><Send className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* POLLS PANEL */}
                {isPollsOpen && (
                    <div className="w-[85vw] md:w-96 bg-zinc-950/98 backdrop-blur-3xl border-y border-r border-white/10 rounded-r-xl shadow-[40px_0_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-300">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-amber-500/5">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Consensus</h3>
                            <button onClick={() => setIsPollsOpen(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {polls.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 py-20 gap-3">
                                    <Shield className="w-10 h-10 opacity-20" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">No Active Votes</span>
                                </div>
                            ) : (
                                polls.map(poll => (
                                    <div key={poll.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="text-xs font-bold text-white mb-3 uppercase tracking-tight">{poll.question}</div>
                                        <div className="space-y-2">
                                            {poll.options.map(opt => (
                                                <button key={opt.id} onClick={() => onCastVote(poll.id, opt.id)} className="w-full p-2.5 bg-black/20 border border-white/5 rounded-lg text-left text-[10px] text-zinc-400 hover:border-amber-500/50 hover:text-white transition-all">
                                                    {opt.text}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scanline {
                    0% { transform: translateY(-50%); }
                    100% { transform: translateY(0%); }
                }
            `}</style>
        </div >
    );
};

export default SquadSidebar;
