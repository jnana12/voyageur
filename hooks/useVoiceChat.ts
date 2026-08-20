import { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';

interface VoiceMember {
    user_id: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    hasVideo?: boolean;
}

export const useVoiceChat = (
    currentUser: UserProfile | null,
    squadId: string | undefined,
    onSendMessage: (text: string) => void,
    rawMessages: any[],
    commSettings?: {
        voice_enabled?: boolean;
        video_enabled?: boolean;
        audio_bitrate?: 'low' | 'high';
        noise_cancellation?: boolean;
        video_resolution?: '720p' | '1080p' | '4k';
        frame_rate?: '30' | '60';
        bandwidth_saver?: boolean;
    }
) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false); // Default false, will set true on join
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Refs for accessing state inside callbacks (like ontrack) without dependency cycles
    const isMutedRef = useRef(isMuted);
    const isDeafenedRef = useRef(isDeafened);
    const instanceId = useRef(Math.random().toString(36).substring(7));

    useEffect(() => {
        console.log(`[VoiceChat] Hook Mounted. Instance ID: ${instanceId.current}`);
        return () => console.log(`[VoiceChat] Hook Unmounted. Instance ID: ${instanceId.current}`);
    }, []);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isDeafenedRef.current = isDeafened; }, [isDeafened]);

    const [voiceMembers, setVoiceMembers] = useState<Record<string, VoiceMember>>({});
    const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
    const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
    const [selectedInput, setSelectedInput] = useState<string>('');
    const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');

    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const remoteStreams = useRef<Record<string, MediaStream>>({}); // For video
    const [remoteVideoTrigger, setRemoteVideoTrigger] = useState(0); // Hack to force rerender for video

    const audioElements = useRef<Record<string, HTMLAudioElement>>({});
    const iceQueues = useRef<Record<string, RTCIceCandidateInit[]>>({});
    const processedMessages = useRef<Set<string>>(new Set());
    const isProcessing = useRef(false);
    const joinTime = useRef<number>(0);

    // 1. Device Management
    const refreshDevices = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            const videoIn = devices.filter(d => d.kind === 'videoinput');
            setAudioInputs(inputs);
            setVideoInputs(videoIn);

            setSelectedInput(prev => {
                if (!prev && inputs.length > 0) return inputs[0].deviceId;
                return prev;
            });
            setSelectedVideoInput(prev => {
                if (!prev && videoIn.length > 0) return videoIn[0].deviceId;
                return prev;
            });

        } catch (err) {
            console.error('Error enumerating devices:', err);
        }
    }, []); // Stable dependency


    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

        refreshDevices();
        const handleDeviceChange = () => refreshDevices();
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        };
    }, [refreshDevices]);

    useEffect(() => {
        // Global cleanup on unmount/reload
        return () => {
            console.log('UseVoiceChat Unmount Cleanup');
            // Close all PCs
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};

            // Stop all local tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }

            // Cleanup audio elements
            Object.values(audioElements.current).forEach(el => {
                el.pause();
                el.srcObject = null;
                try { document.body.removeChild(el); } catch (e) { } // Detach from DOM
                el.remove();
            });
            audioElements.current = {};

            // Cleanup remote video references
            remoteStreams.current = {};
        };
    }, []);

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ]
    };

    // Helper to send signaling messages
    const sendSignaling = useCallback((type: string, targetId: string, data: any) => {
        if (!currentUser?.id) return;
        const payload = JSON.stringify({ type, targetId, senderId: currentUser.id, data });
        onSendMessage(`VOICE_SIG:${payload}`);
    }, [currentUser?.id, onSendMessage]);

    // Initialize or cleanup local stream
    const toggleConnection = async () => {
        if (!isConnected) {
            setIsConnecting(true); // Show UI immediately
            try {
                // Determine constraints based on commSettings
                const audioConstraints: any = {
                    deviceId: selectedInput ? { exact: selectedInput } : undefined,
                    echoCancellation: true,
                    noiseSuppression: commSettings?.noise_cancellation ?? true,
                    autoGainControl: true,
                };

                let videoConstraints: any = false;

                if (commSettings?.video_enabled || isVideoEnabled) {
                    const width = commSettings?.video_resolution === '4k' ? 3840 : commSettings?.video_resolution === '720p' ? 1280 : 1920;
                    const height = commSettings?.video_resolution === '4k' ? 2160 : commSettings?.video_resolution === '720p' ? 720 : 1080;
                    const frameRate = parseInt(commSettings?.frame_rate || '60');

                    videoConstraints = {
                        deviceId: selectedVideoInput ? { exact: selectedVideoInput } : undefined,
                        width: { ideal: width },
                        height: { ideal: height },
                        frameRate: { ideal: frameRate }
                    };

                    // Bandwidth Saver Override
                    if (commSettings?.bandwidth_saver) {
                        videoConstraints.width = { ideal: 640 };
                        videoConstraints.height = { ideal: 480 };
                        videoConstraints.frameRate = { ideal: 15 };
                    }
                }

                console.log('Requesting media with:', { audio: audioConstraints, video: videoConstraints });
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                    video: videoConstraints
                });

                localStreamRef.current = stream;

                // Set join time to ignore old signaling messages
                joinTime.current = Date.now();

                // Reset defaults on join
                setIsMuted(true);
                setIsDeafened(true);

                setIsConnected(true);
                sendSignaling('JOIN', 'ALL', {});
            } catch (err) {
                console.error('Failed to get mic access:', err);
                setIsConnecting(false);
                alert('Microphone access denied or device not found.');
            }
        } else {
            // Leave
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
            iceQueues.current = {}; // Clear queues
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            setIsConnected(false);
            setIsConnecting(false);
            sendSignaling('LEAVE', 'ALL', {});
            setVoiceMembers({});
            // Clear audio elements
            Object.values(audioElements.current).forEach(el => {
                el.pause();
                el.srcObject = null;
            });
            audioElements.current = {};
        }
    };

    const createPeerConnection = useCallback((targetId: string) => {
        if (peerConnections.current[targetId]) return peerConnections.current[targetId];

        const pc = new RTCPeerConnection(iceServers);

        // Add local tracks
        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                if (localStreamRef.current) {
                    pc.addTrack(track, localStreamRef.current);
                }
            });
        }

        // Strict Video Transceiver Initialization
        // Always add a video transceiver to fix m-line order
        // Check if we already have a video track to send
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (!pc.getTransceivers().find(t => t.receiver.track.kind === 'video')) {
            if (videoTrack) {
                // If we have video, init as sendrecv and attach track immediately
                pc.addTransceiver(videoTrack, { direction: 'sendrecv' });
            } else {
                // Otherwise init as recvonly (placeholder)
                pc.addTransceiver('video', { direction: 'recvonly' });
            }
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignaling('ICE', targetId, event.candidate);
            }
        };

        pc.ontrack = (event) => {
            console.log('Received remote track from:', targetId, event.track.kind);
            const remoteStream = event.streams[0];

            if (event.track.kind === 'video') {
                // Use the stream provided by the browser to ensure sync
                if (remoteStream) {
                    remoteStreams.current[targetId] = remoteStream;
                } else {
                    // Fallback if no stream provided (rare)
                    if (!remoteStreams.current[targetId]) {
                        remoteStreams.current[targetId] = new MediaStream();
                    }
                    remoteStreams.current[targetId].addTrack(event.track);
                }
                // Listen for track ending or muting
                event.track.onmute = () => {
                    console.log('Track muted/ended (video)', targetId);
                    setRemoteVideoTrigger(prev => prev + 1);
                };
                event.track.onunmute = () => {
                    console.log('Track unmuted/resumed (video)', targetId);
                    setRemoteVideoTrigger(prev => prev + 1);
                }
                event.track.onended = () => {
                    console.log('Track ended (video)', targetId);
                    if (remoteStreams.current[targetId]) {
                        delete remoteStreams.current[targetId];
                    }
                    setRemoteVideoTrigger(prev => prev + 1);
                };

                setRemoteVideoTrigger(prev => prev + 1);
            } else {
                // Audio
                let audio = audioElements.current[targetId];
                if (!audio) {
                    audio = new Audio();
                    audio.autoplay = true;
                    audio.muted = isDeafenedRef.current; // Initialize with current state from ref
                    audioElements.current[targetId] = audio;
                }

                if (audio.srcObject !== remoteStream) {
                    audio.srcObject = remoteStream;
                    audio.play().catch(e => console.error('Playback failed:', e));
                }
            }
        };

        peerConnections.current[targetId] = pc;
        return pc;
    }, [sendSignaling]);

    // Handle incoming signaling messages
    useEffect(() => {
        if (!isConnected || !currentUser?.id || isProcessing.current) return;

        const processSignaling = async () => {
            isProcessing.current = true;
            try {
                // Find all new signaling messages that happened recently
                const now = Date.now();
                const newSignalingMessages = rawMessages.filter(m =>
                    m.message?.startsWith('VOICE_SIG:') &&
                    !processedMessages.current.has(m.id) &&
                    // Accept messages within a 30s window of join or recent
                    new Date(m.created_at).getTime() > Math.min(joinTime.current - 10000, now - 30000)
                );

                for (const msg of newSignalingMessages) {
                    processedMessages.current.add(msg.id);
                    try {
                        const { type, targetId, senderId, data } = JSON.parse(msg.message.replace('VOICE_SIG:', ''));

                        if (senderId === currentUser.id) continue;
                        if (targetId !== 'ALL' && targetId !== currentUser.id) continue;

                        const pc = createPeerConnection(senderId);
                        const state = pc.signalingState;
                        const isPolite = currentUser.id < senderId;

                        if (type === 'JOIN') {
                            // FORCE RESET: If we see a JOIN, the other user likely reloaded.
                            // We MUST clean up the old connection to avoid Glare/State mismatch.
                            if (peerConnections.current[senderId]) {
                                console.warn('Received JOIN from existing peer, resetting connection:', senderId);
                                peerConnections.current[senderId].close();
                                delete peerConnections.current[senderId];
                                delete iceQueues.current[senderId];
                                delete remoteStreams.current[senderId];
                                setRemoteVideoTrigger(prev => prev + 1);
                            }

                            const pc = createPeerConnection(senderId);

                            // If we are already connected or connecting, ignore JOIN
                            if (state !== 'stable') continue;

                            // Re-Attach Video if Enabled
                            const videoTrack = localStreamRef.current?.getVideoTracks()[0];
                            if (videoTrack) {
                                const senders = pc.getSenders();
                                const videoSender = senders.find(s => s.track?.kind === 'video');
                                if (!videoSender) {
                                    // If we have video but didn't add it yet (transceiver is recvonly from init)
                                    const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
                                    if (transceiver) {
                                        await transceiver.sender.replaceTrack(videoTrack);
                                        transceiver.direction = 'sendrecv';
                                    } else {
                                        pc.addTrack(videoTrack, localStreamRef.current!);
                                    }
                                }
                            }

                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            sendSignaling('OFFER', senderId, offer);

                            setVoiceMembers(prev => ({
                                ...prev,
                                [senderId]: { user_id: senderId, isSpeaking: false, isMuted: false, isDeafened: false }
                            }));
                        } else if (type === 'OFFER') {
                            if (state !== 'stable') {
                                if (state === 'have-local-offer') {
                                    if (!isPolite) {
                                        console.warn('Glare detected (impolite): Ignoring incoming offer');
                                        continue;
                                    }
                                    // Polite peer: Rollback local offer
                                    console.log('Glare detected (polite): Rolling back for incoming offer');
                                    await pc.setLocalDescription({ type: 'rollback' });
                                } else {
                                    // In some other state, ignore
                                    continue;
                                }
                            }

                            const offerDesc = new RTCSessionDescription(data);
                            await pc.setRemoteDescription(offerDesc);

                            // Strict Transceiver Management for Answer
                            // Ensure video transceiver is set to recvonly/sendrecv to satisfy offer
                            const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
                            if (videoTransceiver) {
                                // If we have a local video track, we want sendrecv
                                const localVideo = localStreamRef.current?.getVideoTracks()[0];
                                if (localVideo) {
                                    // Ensure we are sending it
                                    if (videoTransceiver.sender.track !== localVideo) {
                                        await videoTransceiver.sender.replaceTrack(localVideo);
                                    }
                                    videoTransceiver.direction = 'sendrecv';
                                } else {
                                    // Otherwise ensure we are recvonly (not inactive)
                                    // This fixes the "Incompatible send direction" error
                                    if (videoTransceiver.direction === 'inactive') {
                                        videoTransceiver.direction = 'recvonly';
                                    }
                                }
                            }

                            if (iceQueues.current[senderId]) {
                                for (const cand of iceQueues.current[senderId]) {
                                    try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { }
                                }
                                delete iceQueues.current[senderId];
                            }

                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            sendSignaling('ANSWER', senderId, answer);
                        } else if (type === 'ANSWER') {
                            if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-pranswer') {
                                await pc.setRemoteDescription(new RTCSessionDescription(data));
                                if (iceQueues.current[senderId]) {
                                    for (const cand of iceQueues.current[senderId]) {
                                        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { }
                                    }
                                    delete iceQueues.current[senderId];
                                }
                            }
                        }
                        else if (type === 'ICE') {
                            if (data) {
                                if (pc.remoteDescription && pc.remoteDescription.type) {
                                    try { await pc.addIceCandidate(new RTCIceCandidate(data)); } catch (e) { }
                                } else {
                                    if (!iceQueues.current[senderId]) iceQueues.current[senderId] = [];
                                    iceQueues.current[senderId].push(data);
                                }
                            }
                        } else if (type === 'LEAVE') {
                            pc.close();
                            delete peerConnections.current[senderId];
                            delete iceQueues.current[senderId];
                            delete remoteStreams.current[senderId]; // Cleanup Video Stream
                            setRemoteVideoTrigger(prev => prev + 1); // Trigger UI update
                            if (audioElements.current[senderId]) {
                                const el = audioElements.current[senderId];
                                el.pause();
                                el.srcObject = null;
                                try { document.body.removeChild(el); } catch (e) { } // Detach from DOM
                                delete audioElements.current[senderId];
                            }
                            setVoiceMembers(prev => {
                                const next = { ...prev };
                                delete next[senderId];
                                return next;
                            });
                        }
                    } catch (e) {
                        console.error('Failed to process voice signaling packet:', e);
                    }
                }
            } finally {
                isProcessing.current = false;
            }
        };

        processSignaling();
    }, [rawMessages, isConnected, currentUser?.id, createPeerConnection, sendSignaling]);

    // Toggle mute/deafen
    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
        }
    }, [isMuted]);

    useEffect(() => {
        Object.values(audioElements.current).forEach(audio => {
            audio.muted = isDeafened;
        });
    }, [isDeafened]);

    // Switch Input Device (Exclude isMuted to prevent re-fetch on mute toggle)
    useEffect(() => {
        if (isConnected && localStreamRef.current && selectedInput) {
            const updateStream = async () => {
                console.log('🎤 Switching Input Device to:', selectedInput);
                try {
                    // Use exact constraint only if not default/empty to allow fallback
                    const constraints = selectedInput === 'default' || !selectedInput
                        ? { audio: true }
                        : { audio: { deviceId: { exact: selectedInput } } };

                    const newAudioStream = await navigator.mediaDevices.getUserMedia(constraints);
                    const newAudioTrack = newAudioStream.getAudioTracks()[0];

                    // Apply current mute state to the new track
                    newAudioTrack.enabled = !isMutedRef.current;

                    // 1. Preserve active video track
                    let videoTrack = localStreamRef.current?.getVideoTracks()[0];

                    // 2. Replace track in all PeerConnections
                    const replacePromises = Object.entries(peerConnections.current).map(([id, pc]) => {
                        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                        if (sender) {
                            console.log(`Replacing audio track for peer ${id}`);
                            return sender.replaceTrack(newAudioTrack);
                        }
                        return Promise.resolve();
                    });

                    await Promise.all(replacePromises);

                    // 3. Update Local Stream Ref (Combine new audio + old video)
                    const newCombinedStream = new MediaStream();
                    newCombinedStream.addTrack(newAudioTrack);
                    if (videoTrack) {
                        newCombinedStream.addTrack(videoTrack);
                    }

                    // 4. Stop ONLY the old AUDIO tracks
                    localStreamRef.current?.getAudioTracks().forEach(t => t.stop());

                    // 5. Set new ref
                    localStreamRef.current = newCombinedStream;
                    console.log('✅ Input Device Switched Successfully');
                } catch (e) {
                    console.error('❌ Failed to switch input device:', e);
                    alert('Failed to switch microphone. Please check permissions.');
                }
            };
            updateStream();
        }
    }, [selectedInput, isConnected]); // Removed isMuted dependency!



    // Toggle Video
    const toggleVideo = async () => {
        if (!localStreamRef.current) return;

        const videoTrack = localStreamRef.current.getVideoTracks()[0];

        // --- CASE 1: ENABLE VIDEO (No active track) ---
        if (!videoTrack) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: selectedVideoInput ? { deviceId: { exact: selectedVideoInput } } : true
                });
                const newTrack = videoStream.getVideoTracks()[0];
                localStreamRef.current.addTrack(newTrack);
                setIsVideoEnabled(true);

                // Update PeerConnections
                const updatePromises = Object.entries(peerConnections.current).map(async ([targetId, pc]) => {
                    // 1. Try to find existing video transceiver to reuse
                    let transceiver = pc.getTransceivers().find(t =>
                        t.receiver.track.kind === 'video' || t.sender.track?.kind === 'video'
                    );

                    if (transceiver) {
                        // REUSE transceiver
                        console.log('Reusing existing video transceiver', targetId);
                        await transceiver.sender.replaceTrack(newTrack);
                        transceiver.direction = 'sendrecv';
                    } else {
                        // CREATE new transceiver
                        console.log('Adding new video track', targetId);
                        pc.addTrack(newTrack, localStreamRef.current!);
                    }

                    // Safe Negotiation
                    if (pc.signalingState === 'stable') {
                        try {
                            const offer = await pc.createOffer();
                            if (pc.signalingState === 'stable') {
                                await pc.setLocalDescription(offer);
                                sendSignaling('OFFER', targetId, offer);
                            }
                        } catch (e) { console.error('Negotiation failed', e); }
                    }
                });
                await Promise.all(updatePromises);
            } catch (e) {
                console.error('Failed to enable video', e);
                alert('Could not access camera');
            }

            // --- CASE 2: DISABLE VIDEO (Active track exists) ---
        } else {
            // Stop local hardware
            videoTrack.stop();
            localStreamRef.current.removeTrack(videoTrack);
            setIsVideoEnabled(false);

            // Disable in PeerConnections
            const disablePromises = Object.entries(peerConnections.current).map(async ([targetId, pc]) => {
                const transceiver = pc.getTransceivers().find(t => t.sender.track?.kind === 'video');
                if (transceiver) {
                    console.log('Disabling video transceiver', targetId);
                    await transceiver.sender.replaceTrack(null);
                    transceiver.direction = 'recvonly'; // Keep receiving, stop sending

                    // Negotiate change
                    if (pc.signalingState === 'stable') {
                        try {
                            const offer = await pc.createOffer();
                            if (pc.signalingState === 'stable') {
                                await pc.setLocalDescription(offer);
                                sendSignaling('OFFER', targetId, offer);
                            }
                        } catch (err) { console.error('Failed to negotiate video removal', err); }
                    }
                }
            });
            await Promise.all(disablePromises);
        }
    };

    // === API MAPPING ===
    const roomState = isConnected ? 'connected' : 'disconnected';
    const toggleMute = () => setIsMuted(prev => !prev);
    const toggleDeafen = () => setIsDeafened(prev => !prev);
    const leaveRoom = () => toggleConnection();
    const activeSpeakers = Object.values(voiceMembers).filter(m => m.isSpeaking).map(m => m.user_id);
    const participants = Object.values(voiceMembers);
    const toggleScreenShare = () => { console.warn('Screen share not implemented'); };
    const error = null; // Add error state management if needed

    return {
        // Core State
        roomState,
        isConnected, // Keep original for compatibility if needed
        isConnecting,
        isMuted,
        isDeafened,
        isVideoEnabled,

        // Actions
        toggleMute,
        toggleDeafen,
        toggleVideo,
        toggleScreenShare,
        leaveRoom,
        toggleConnection,

        // Data
        activeSpeakers,
        participants,
        voiceMembers,
        localStream: localStreamRef.current,
        remoteStreams: remoteStreams.current,
        remoteVideoTrigger,
        error,

        // Devices
        audioInputs,
        videoInputs,
        selectedInput,
        selectedVideoInput,
        setSelectedInput,
        setSelectedVideoInput,
        refreshDevices
    };
};
