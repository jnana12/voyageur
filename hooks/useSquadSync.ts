import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { PresencePayload, presenceService } from '../services/presenceService';

import { SquadMember, MissionMessage, MissionPoll } from '../types';

export const useSquadSync = (tripId: string | null, userId: string | null) => {
    // State with LocalStorage Initialization
    const [dbMembers, setDbMembers] = useState<SquadMember[]>(() => {
        if (typeof window === 'undefined' || !tripId) return [];
        const saved = localStorage.getItem(`squad_members_${tripId}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [profiles, setProfiles] = useState<Record<string, { name: string, avatar: string }>>({});
    const [presence, setPresence] = useState<Record<string, PresencePayload>>({});
    const [messages, setMessages] = useState<MissionMessage[]>(() => {
        if (typeof window === 'undefined' || !tripId) return [];
        const saved = localStorage.getItem(`squad_messages_${tripId}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [rawMessages, setRawMessages] = useState<MissionMessage[]>([]);
    const [polls, setPolls] = useState<MissionPoll[]>(() => {
        if (typeof window === 'undefined' || !tripId) return [];
        const saved = localStorage.getItem(`squad_polls_${tripId}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [votes, setVotes] = useState<Record<string, Record<string, number>>>({});
    const [userVotes, setUserVotes] = useState<Record<string, string>>({});
    const [missionCode, setMissionCode] = useState<string | null>(() => {
        if (typeof window === 'undefined' || !tripId) return null;
        return localStorage.getItem(`squad_code_${tripId}`);
    });
    const [isLoading, setIsLoading] = useState(false);

    // REACTIVE MEMBER LOGIC: Combine DB Members + Realtime Presence
    const members = useMemo(() => {
        if (!tripId) return [];

        // 1. Start with DB Members
        const membersList = [...dbMembers];

        // 2. GHOST LOGIC: Detect users in Presence but NOT in DB
        const currentPresenceKeys = Object.keys(presence);
        currentPresenceKeys.forEach(pk => {
            const exists = membersList.find(m => m.user_id === pk);
            if (!exists) {
                console.info("SquadSync: Adding Ghost Member (Reactive):", pk);
                membersList.push({
                    user_id: pk,
                    role: 'Vanguard',
                    joined_at: new Date().toISOString(),
                    trip_id: tripId,
                    full_name: profiles[pk]?.name || 'Guest',
                    avatar_url: profiles[pk]?.avatar || '',
                    isGhost: true
                } as any);
            }
        });

        // 3. Hydrate names & avatars from profiles
        const results = membersList.map((m: any) => {
            const profile = profiles[m.user_id];
            const avatar = m.avatar_url || profile?.avatar || '';
            return {
                ...m,
                full_name: typeof m.full_name === 'string' && m.full_name !== 'Agent'
                    ? m.full_name
                    : (profile?.name || m.full_name || 'Agent'),
                avatar_url: avatar
            };
        });

        // Sync to cache for instant load next time
        if (results.length > 0) {
            localStorage.setItem(`squad_members_${tripId}`, JSON.stringify(results));
        }

        return results;
    }, [dbMembers, presence, profiles, tripId]);

    // 1. Initial Data Fetch
    const fetchInitialData = useCallback(async () => {
        if (!tripId || !supabase) return;
        setIsLoading(true);

        try {
            // WAVE 1: Parallel Fetch
            const [
                { data: membersData },
                { data: tripData },
                { data: messagesData },
                { data: presenceData },
                { data: pollsData }
            ] = await Promise.all([
                supabase.from('squad_members').select('*').eq('trip_id', tripId),
                supabase.from('trips').select('mission_code, user_id, status').eq('id', tripId).maybeSingle(),
                supabase.from('mission_comms').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
                supabase.from('tactical_presence').select('*').eq('trip_id', tripId),
                supabase.from('mission_polls').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
            ]);

            if (tripData?.mission_code) {
                setMissionCode(tripData.mission_code);
            } else if (tripData?.status === 'confirmed' && tripData?.user_id === userId) {
                await refreshMissionCode();
            }

            if (messagesData) {
                setRawMessages(messagesData);
                setMessages(messagesData.filter((m: any) => !m.message.startsWith('VOICE_SIG:')));
            }

            if (presenceData) {
                const presenceMap: Record<string, PresencePayload> = {};
                presenceData.forEach(p => presenceMap[p.user_id] = p);
                setPresence(presenceMap);
            }

            if (pollsData) setPolls(pollsData);

            // WAVE 2: Profiles & Votes
            const allUserIds = new Set<string>();
            membersData?.forEach(m => allUserIds.add(m.user_id));
            if (tripData?.user_id) allUserIds.add(tripData.user_id);
            messagesData?.forEach(m => allUserIds.add(m.user_id));
            presenceData?.forEach(m => allUserIds.add(m.user_id));

            if (allUserIds.size > 0) {
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', Array.from(allUserIds));

                if (profilesData) {
                    const profileMap: Record<string, { name: string, avatar: string }> = {};
                    profilesData.forEach((p: any) => {
                        profileMap[p.id] = {
                            name: p.full_name || 'Agent',
                            avatar: p.avatar_url || ''
                        };
                    });
                    setProfiles(profileMap);
                }
            }

            if (pollsData && pollsData.length > 0) {
                const { data: votesData } = await supabase
                    .from('poll_votes')
                    .select('poll_id, option_id, user_id')
                    .in('poll_id', pollsData.map(p => p.id));

                if (votesData) {
                    const voteMap: Record<string, Record<string, number>> = {};
                    const userVoteMap: Record<string, string> = {};
                    votesData.forEach((v: any) => {
                        if (!voteMap[v.poll_id]) voteMap[v.poll_id] = {};
                        voteMap[v.poll_id][v.option_id] = (voteMap[v.poll_id][v.option_id] || 0) + 1;
                        if (userId && v.user_id === userId) userVoteMap[v.poll_id] = v.option_id;
                    });
                    setVotes(voteMap);
                    setUserVotes(userVoteMap);
                }
            }

            const membersList = membersData || [];

            // Owner Repair logic
            const ownerInSquad = membersList.find(m => m.user_id === tripData?.user_id);
            if (tripData?.user_id && !ownerInSquad) {
                // INJECT into memory instantly to prevent ghosting
                membersList.push({
                    trip_id: tripId,
                    user_id: tripData.user_id,
                    role: 'Captain',
                    joined_at: new Date().toISOString()
                } as any);

                if (userId === tripData.user_id) {
                    supabase.from('squad_members').upsert({
                        trip_id: tripId,
                        user_id: tripData.user_id,
                        role: 'Captain',
                        joined_at: new Date().toISOString()
                    }, { onConflict: 'trip_id,user_id' }).then(({ error }) => {
                        if (error && error.code !== '23505') console.error("Auto-repair failed:", error);
                    });
                }
            }

            setDbMembers(membersList);

        } catch (error) {
            console.error("SquadSync: Initial fetch failed", error);
        } finally {
            setIsLoading(false);
        }
    }, [tripId, userId]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Handle Trip Switch
    useEffect(() => {
        if (!tripId) {
            setDbMembers([]);
            setMessages([]);
            setPolls([]);
            setMissionCode(null);
            return;
        }

        const savedMembers = localStorage.getItem(`squad_members_${tripId}`);
        if (savedMembers) setDbMembers(JSON.parse(savedMembers));
        else setDbMembers([]);

        const savedMsgs = localStorage.getItem(`squad_messages_${tripId}`);
        if (savedMsgs) setMessages(JSON.parse(savedMsgs));
        else setMessages([]);

        const savedPolls = localStorage.getItem(`squad_polls_${tripId}`);
        if (savedPolls) setPolls(JSON.parse(savedPolls));
        else setPolls([]);

        const savedCode = localStorage.getItem(`squad_code_${tripId}`);
        if (savedCode) setMissionCode(savedCode);
        else setMissionCode(null);

    }, [tripId]);

    // Subscriptions
    useEffect(() => {
        if (!tripId || !supabase) return;

        const presenceChannel = supabase.channel(`presence_${tripId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tactical_presence',
                filter: `trip_id=eq.${tripId}`
            }, (payload) => {
                const newPresence = payload.new as PresencePayload;
                setPresence(prev => ({ ...prev, [newPresence.user_id]: newPresence }));
            })
            .subscribe();

        const commsChannel = supabase.channel(`comms_${tripId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'mission_comms',
                filter: `trip_id=eq.${tripId}`
            }, (payload) => {
                const newMsg = payload.new as MissionMessage;
                setRawMessages(prev => [...prev, newMsg]);
                setMessages(prev => {
                    if (newMsg.message.startsWith('VOICE_SIG:')) return prev;
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            })
            .subscribe();

        const membersChannel = supabase.channel(`members_${tripId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'squad_members',
                filter: `trip_id=eq.${tripId}`
            }, () => {
                fetchInitialData();
            })
            .subscribe();

        const tripsSyncChannel = supabase.channel(`trips_sync_${tripId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'trips',
                filter: `id=eq.${tripId}`
            }, (payload) => {
                console.log('🔄 [useSquadSync] Trip data update detected. refreshing...');

                // NEW: If the mission was cancelled or completed, trigger a global UI refresh
                // so the Dashboard will compute a new activeMission and recalculate stats.
                if (payload.new && ((payload.new as any).status === 'cancelled' || (payload.new as any).status === 'completed')) {
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('voyageur:db-update'));
                    }
                }

                fetchInitialData();
            })
            .subscribe();

        const heartbeat = setInterval(fetchInitialData, 30000);

        return () => {
            supabase.removeChannel(presenceChannel);
            supabase.removeChannel(commsChannel);
            supabase.removeChannel(membersChannel);
            supabase.removeChannel(tripsSyncChannel);
            clearInterval(heartbeat);
        };
    }, [tripId, fetchInitialData]);

    useEffect(() => {
        if (userId && tripId) {
            presenceService.startTracking(userId, tripId);
        }
        return () => {
            presenceService.stopTracking();
        };
    }, [userId, tripId]);

    const refreshMissionCode = async () => {
        if (!tripId || !supabase) return;
        const { dbService } = await import('../services/dbService');
        const newCode = await dbService.generateMissionCode(tripId);
        if (newCode) setMissionCode(newCode);
    };

    const sendMessage = async (text: string) => {
        if (!userId || !tripId || !supabase) return;
        const isAiTrigger = text.toLowerCase().includes('@voyageur');
        const tempId = `temp_${Date.now()}`;
        const optimisticMessage: MissionMessage = {
            id: tempId,
            user_id: userId,
            message: text,
            is_ai_trigger: isAiTrigger,
            created_at: new Date().toISOString(),
            trip_id: tripId
        };
        if (!text.startsWith('VOICE_SIG:')) {
            setMessages(prev => [...prev, optimisticMessage]);
        }

        const { error } = await supabase
            .from('mission_comms')
            .insert({
                trip_id: tripId,
                user_id: userId,
                message: text,
                is_ai_trigger: isAiTrigger
            });

        if (error) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const createPoll = async (question: string, options: string[]) => {
        if (!userId || !tripId || !supabase) return;
        const pollOptions = options.map((text, i) => ({ id: `opt_${Date.now()}_${i}`, text }));
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await supabase.from('mission_polls').insert({ trip_id: tripId, question, options: pollOptions, expires_at: expiresAt });
    };

    const castVote = async (pollId: string, optionId: string) => {
        if (!userId || !supabase) return;
        await supabase.from('poll_votes').upsert({ poll_id: pollId, user_id: userId, option_id: optionId });
    };

    const refreshSquad = useCallback(async () => {
        await fetchInitialData();
    }, [fetchInitialData]);

    return {
        members,
        presence,
        messages,
        rawMessages,
        polls,
        votes,
        userVotes,
        missionCode,
        isLoading,
        sendMessage,
        createPoll,
        castVote,
        refreshMissionCode,
        refreshSquad
    };
};
