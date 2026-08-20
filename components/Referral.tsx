import React from 'react';
import { Share2, Copy, Gift, UserCheck } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';

const Referral: React.FC = () => {
    const history = [
        { email: "mike.t@example.com", date: "Oct 12, 2024", status: "Joined", reward: "+1000 Pts" },
        { email: "sarah.j@example.com", date: "Sep 28, 2024", status: "Pending", reward: "-" },
    ];

    return (
        <PageWrapper>
            <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8 md:p-12 text-left relative overflow-hidden mb-12 shadow-[0_0_50px_rgba(34,211,238,0.1)] rounded-2xl animate-fade-in-up">
                <div className="absolute top-0 right-0 p-40 bg-cyan-500/10 blur-[100px]" />

                <div className="relative z-10">
                    <Gift className="w-16 h-16 text-cyan-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                    <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-tight font-sans text-center">Invite & Earn</h2>
                    <p className="text-zinc-400 text-lg mb-12 max-w-lg mx-auto font-sans leading-relaxed text-center">
                        Give your friends a <span className="text-white font-bold">$50</span> credit towards their first trip.
                        You'll get <span className="text-cyan-400 font-bold">1000 Voyager Points</span> when they book.
                    </p>

                    <div className="bg-white/5 border border-white/20 p-2 flex flex-col sm:flex-row items-center justify-between max-w-md mx-auto mb-8 rounded-lg backdrop-blur-sm gap-4 sm:gap-0">
                        <code className="text-xl font-mono text-cyan-400 font-bold px-4 tracking-widest">VOYAGE-X92</code>
                        <button
                            onClick={() => navigator.clipboard.writeText('VOYAGE-X92')}
                            className="w-full sm:w-auto px-6 py-3 bg-white text-black font-bold uppercase text-xs tracking-wider hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 rounded"
                        >
                            <Copy className="w-4 h-4" /> Copy
                        </button>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button className="p-4 border border-white/10 hover:bg-white hover:text-black transition-colors rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                            <Share2 className="w-6 h-6" />
                        </button>
                        {/* Add social icons as needed */}
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="border-t border-white/10 pt-12 animate-fade-in-up delay-100">
                <h3 className="text-lg font-bold text-white uppercase mb-6 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-zinc-500" /> Referral History
                </h3>
                <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
                    <div className="min-w-[500px]">
                        <div className="grid grid-cols-4 p-4 border-b border-white/10 bg-white/5 text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                            <span>Email</span>
                            <span>Date</span>
                            <span>Status</span>
                            <span className="text-right">Reward</span>
                        </div>
                        {history.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-4 p-4 border-b border-white/5 text-sm font-mono text-zinc-300 last:border-0 hover:bg-white/5 transition-colors group">
                                <span className="group-hover:text-white transition-colors">{item.email}</span>
                                <span>{item.date}</span>
                                <span className={item.status === 'Joined' ? 'text-emerald-400 font-bold' : 'text-orange-400 font-bold'}>{item.status}</span>
                                <span className="text-right font-bold text-white group-hover:text-cyan-400 transition-colors">{item.reward}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default Referral;
