import React from 'react';
import { CreditCard, Plus, ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';

const Wallet: React.FC = () => {
    const transactions = [
        { id: "TX_9982", desc: "Refund: Flight Cancellation", amount: "+$240.00", date: "Oct 12, 2024", type: "credit" },
        { id: "TX_9981", desc: "Booking: Tokyo Hotel", amount: "-$850.00", date: "Oct 10, 2024", type: "debit" },
        { id: "TX_9980", desc: "Credit: Referral Bonus", amount: "+$50.00", date: "Sep 28, 2024", type: "credit" },
    ];

    return (
        <PageWrapper>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 uppercase tracking-tight font-sans text-left animate-fade-in-up">Digital Wallet</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-12 animate-fade-in-up delay-100">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-md border border-white/10 p-6 md:p-8 relative overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.15)] rounded-2xl">
                    <div className="absolute top-0 right-0 p-24 bg-cyan-500/20 blur-[80px]" />
                    <div className="relative z-10">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">Available Balance</div>
                        <div className="text-5xl font-bold text-white mb-8 tracking-tight font-sans">$290.00</div>
                        <div className="flex gap-4">
                            <button className="flex-1 py-3 bg-white text-black font-bold uppercase text-xs tracking-wider hover:bg-cyan-400 transition-colors shadow-lg font-sans rounded">Add Funds</button>
                            <button className="flex-1 py-3 border border-white/20 text-white font-bold uppercase text-xs tracking-wider hover:bg-white hover:text-black transition-colors font-sans rounded">Withdraw</button>
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-black/50 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Payment Methods</h3>
                        <button className="p-2 border border-white/20 hover:bg-white hover:text-black transition-colors rounded-full"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 border border-white/10 bg-white/5 rounded-lg hover:border-cyan-400/30 transition-colors">
                            <CreditCard className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white font-sans">Visa •••• 4242</div>
                                <div className="text-xs text-zinc-500 font-sans">Expires 12/25</div>
                            </div>
                            <span className="text-[10px] bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 px-2 py-1 font-bold uppercase rounded">Default</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions */}
            <div className="border-t border-white/10 pt-12 animate-fade-in-up delay-200">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase">
                    <History className="w-5 h-5 text-zinc-500" /> Transaction History
                </h3>
                <div className="space-y-2">
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-white/5 hover:bg-white/5 transition-colors group cursor-pointer rounded-lg hover:border-white/10 gap-2 sm:gap-0">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-emerald-900/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-zinc-400'}`}>
                                    {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white uppercase font-sans tracking-wide">{tx.desc}</div>
                                    <div className="text-xs text-zinc-500 font-mono group-hover:text-zinc-400 transition-colors">{tx.date} • {tx.id}</div>
                                </div>
                            </div>
                            <div className={`text-sm font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'text-white'} text-right sm:text-left`}>
                                {tx.amount}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageWrapper>
    );
};

export default Wallet;
