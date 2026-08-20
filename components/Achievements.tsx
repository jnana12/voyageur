import React from 'react';
import { Medal, Lock, Globe, Camera, Plane, Map, Star } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';

const Achievements: React.FC = () => {
    const badges = [
        { name: "First Steps", desc: "Plan your first trip", icon: Map, achieved: true },
        { name: "Globe Trotter", desc: "Visit 3 continents", icon: Globe, achieved: false },
        { name: "Shutterbug", desc: "Upload 50 photos", icon: Camera, achieved: true },
        { name: "Mile High", desc: "Fly 10,000 miles", icon: Plane, achieved: false },
        { name: "Food Critic", desc: "Review 10 restaurants", icon: Medal, achieved: false },
        { name: "Local Hero", desc: "Contribute to guides", icon: Medal, achieved: false },
    ];

    return (
        <PageWrapper>
            <div className="animate-fade-in-up">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-tight font-sans">Mission Log</h2>
                    <p className="text-zinc-500 font-sans">Track your progress and unlock elite status.</p>
                </div>

                {/* Level Progress */}
                <div className="bg-black/50 backdrop-blur-md border border-white/10 p-6 md:p-8 mb-16 relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] rounded-2xl">
                    <div className="flex justify-between items-end mb-4 relative z-10">
                        <div>
                            <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 font-mono">Current Level</div>
                            <div className="text-4xl font-bold text-white uppercase font-sans">Explorer Lvl. 4</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 font-mono">Next Milestone</div>
                            <div className="text-xl font-bold text-white uppercase font-sans">Pathfinder</div>
                        </div>
                    </div>

                    <div className="h-4 bg-zinc-900 border border-white/10 relative z-10 overflow-hidden rounded-full">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 w-[65%] shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                    </div>
                    <div className="mt-2 text-right text-xs font-mono text-cyan-400">2,450 / 3,000 XP</div>

                    <div className="absolute top-0 right-0 p-32 bg-cyan-500/10 blur-[80px]" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {badges.map((badge, idx) => (
                        <div key={idx} className={`border p-8 flex flex-col items-center justify-center text-center relative group transition-all duration-500 rounded-xl ${badge.achieved ? 'bg-white/5 border-white/20 hover:border-cyan-400/50 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]' : 'bg-black/50 backdrop-blur-sm border-white/5 opacity-50 grayscale'}`}>
                            <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 ${badge.achieved ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-zinc-800 text-zinc-800'}`}>
                                <badge.icon className="w-8 h-8" />
                            </div>
                            <h3 className={`text-lg font-bold uppercase mb-2 font-sans ${badge.achieved ? 'text-white' : 'text-zinc-600'}`}>{badge.name}</h3>
                            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wide">{badge.desc}</p>

                            {!badge.achieved && (
                                <div className="absolute top-4 right-4">
                                    <Lock className="w-4 h-4 text-zinc-700" />
                                </div>
                            )}
                            {badge.achieved && (
                                <div className="absolute top-4 right-4">
                                    <Star className="w-4 h-4 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </PageWrapper>
    );
};

export default Achievements;
