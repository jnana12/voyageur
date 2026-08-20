import React, { useState } from 'react';
import { Check, X, AlertCircle, Timer } from 'lucide-react';

interface PollOption {
    id: string;
    text: string;
    votes: number;
}

interface ObjectivePollProps {
    id: string;
    question: string;
    options: PollOption[];
    onVote: (optionId: string) => void;
    expiresAt: string;
    hasVoted?: boolean;
}

export const ObjectivePoll: React.FC<ObjectivePollProps> = ({
    id,
    question,
    options,
    onVote,
    expiresAt,
    hasVoted = false
}) => {
    const [isVoting, setIsVoting] = useState(false);

    // Calculate total votes
    const totalVotes = options.reduce((acc, opt) => acc + opt.votes, 0);
    const timeLeft = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const isExpired = timeLeft <= 0;

    return (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in slide-in-from-right duration-500">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/40">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                    <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none mb-1">Mission Objective</h4>
                    <p className="text-white text-sm font-bold uppercase tracking-tight">{question}</p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                {options.map((opt) => {
                    const percent = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;

                    return (
                        <button
                            key={opt.id}
                            disabled={hasVoted || isExpired || isVoting}
                            onClick={() => {
                                setIsVoting(true);
                                onVote(opt.id);
                            }}
                            className={`w-full group relative overflow-hidden p-3 rounded-lg border transition-all ${hasVoted
                                    ? 'bg-zinc-900 border-white/5 cursor-default'
                                    : 'bg-white/5 border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5'
                                }`}
                        >
                            {/* Vote Progress Bar */}
                            <div
                                className="absolute inset-y-0 left-0 bg-cyan-500/10 transition-all duration-1000"
                                style={{ width: `${percent}%` }}
                            />

                            <div className="relative flex justify-between items-center z-10">
                                <span className={`text-xs font-mono uppercase ${hasVoted ? 'text-zinc-500' : 'text-zinc-300 group-hover:text-white'}`}>
                                    {opt.text}
                                </span>
                                <span className="text-[10px] font-bold text-cyan-400">{Math.round(percent)}%</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                    <Timer className="w-3 h-3" />
                    {isExpired ? 'Poll Finalized' : `Expires in ${Math.round(timeLeft / 1000 / 60)}M`}
                </div>
                <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
                    {totalVotes} Directives Cast
                </div>
            </div>
        </div>
    );
};
