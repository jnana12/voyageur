import React from 'react';
import { Fingerprint, TrendingUp, Map } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';

const TravelDNA: React.FC = () => {
    return (
        <PageWrapper>
            <div className="flex items-center gap-4 mb-12 justify-start animate-fade-in-up">
                <Fingerprint className="w-12 h-12 text-cyan-400" />
                <div className="text-left">
                    <h2 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-tight font-sans">Travel DNA™</h2>
                    <p className="text-zinc-400 font-sans">Psychographic analysis of your travel behavior.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-12 gap-8">
                {/* Main Profile Card */}
                <div className="md:col-span-4 bg-black/50 backdrop-blur-md border border-cyan-500/50 p-8 relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] group hover:shadow-[0_0_80px_rgba(6,182,212,0.25)] transition-all duration-500 mx-auto w-full max-w-sm md:max-w-none">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-purple-500 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 font-mono">Dominant Archetype</div>
                    <h3 className="text-5xl font-bold text-white mb-6 uppercase font-sans tracking-tight">The Explorer</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8 font-sans">
                        You value authentic experiences over luxury. You prefer off-the-beaten-path destinations and are willing to sacrifice comfort for culture.
                    </p>
                    <div className="space-y-4">
                        <TraitRow label="Adventure" value={92} />
                        <TraitRow label="Luxury" value={34} />
                        <TraitRow label="Foodie" value={78} />
                        <TraitRow label="Social" value={45} />
                    </div>
                </div>

                {/* Data Viz */}
                <div className="md:col-span-8 grid gap-8">
                    <div className="bg-black border border-white/10 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-white uppercase tracking-wide flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Spending Habits</h3>
                        </div>
                        <div
                            className="h-48 flex items-end gap-2 border-b border-white/10 pb-2"
                            role="list"
                            aria-label="Spending Habits Chart"
                        >
                            {[40, 65, 30, 85].map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-zinc-800 hover:bg-cyan-500 transition-colors relative group"
                                    role="listitem"
                                    aria-label={`${['Experience', 'Accommodation', 'Dining', 'Transport'][i]}: ${h}%`}
                                >
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">{h}%</div>
                                    <div className="h-full w-full bg-cyan-900/20 absolute bottom-0" style={{ height: `${h}%` }}>
                                        <div className="w-full h-full bg-cyan-500/50 border-t border-cyan-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-4 text-xs text-zinc-500 font-mono uppercase">
                            <span>Experience</span>
                            <span>Accommodation</span>
                            <span>Dining</span>
                            <span>Transport</span>
                        </div>
                    </div>

                    <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8">
                        <h3 className="font-bold text-white uppercase tracking-wide flex items-center gap-2 mb-6 font-sans"><Map className="w-4 h-4 text-cyan-400" /> Recommended Frontiers</h3>
                        <ul className="grid md:grid-cols-3 gap-4">
                            <li className="h-32 border border-white/10 bg-zinc-900/50 flex items-center justify-center text-zinc-500 font-bold uppercase hover:text-white hover:border-cyan-400 transition-all cursor-pointer hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] font-mono text-xs">
                                Patagonia
                            </li>
                            <li className="h-32 border border-white/10 bg-zinc-900/50 flex items-center justify-center text-zinc-500 font-bold uppercase hover:text-white hover:border-cyan-400 transition-all cursor-pointer hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] font-mono text-xs">
                                Kyoto Rural
                            </li>
                            <li className="h-32 border border-white/10 bg-zinc-900/50 flex items-center justify-center text-zinc-500 font-bold uppercase hover:text-white hover:border-cyan-400 transition-all cursor-pointer hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] font-mono text-xs">
                                Iceland
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

const TraitRow = ({ label, value }: { label: string, value: number }) => (
    <div className="flex items-center gap-4">
        <div className="w-24 text-xs font-bold text-zinc-500 uppercase">{label}</div>
        <div className="flex-1 h-2 bg-zinc-900">
            <div className="h-full bg-white" style={{ width: `${value}%` }} />
        </div>
        <div className="text-xs font-mono text-cyan-400">{value}%</div>
    </div>
);

export default TravelDNA;
