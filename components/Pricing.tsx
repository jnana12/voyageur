import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Check, Zap, Crown, Globe, Sparkles, Loader2 } from 'lucide-react';
import { AppView, UserProfile } from '../types';
import { paymentService } from '../services/paymentService';
import { dbService } from '../services/dbService';
import { PageWrapper } from './ui/PageWrapper';
import { PageHeader } from './ui/PageHeader';
import { Toast } from './ui/Toast';

interface PricingProps {
    user: UserProfile | null;
    setView: (view: AppView) => void;
}

const Pricing: React.FC<PricingProps> = ({ user, setView }) => {
    // Refs to auto-scroll if needed, or prevent double-trigger
    const hasTriggeredRef = useRef(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    // Removed Error Modal in favor of Toast
    // const [showErrorModal, setShowErrorModal] = useState(false); 

    // NEW: Per-button loading state
    const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);

    // NEW: Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const handlePurchase = useCallback((amount: number, credits: number) => {
        // Prevent if ANY plan is processing (or maybe just this one, but for safety let's block strict re-entry)
        if (processingPlanId !== null) return;

        if (!user) {
            // 1. Redirect to Login/Signup
            console.log("🔒 [Pricing] User not logged in. Redirecting to Auth...");
            localStorage.setItem('pending_purchase', JSON.stringify({ amount, credits }));
            setView(AppView.AUTH);
            return;
        }

        // 2. Set processing state for THIS plan
        setProcessingPlanId(amount);

        // 3. Initiate Payment
        paymentService.initiatePayment(
            user,
            amount,
            credits,
            async (paymentId) => {
                setProcessingPlanId(null);
                setShowSuccessModal(true);
                // Clear pending and redirect after modal dismissal
                localStorage.removeItem('pending_purchase');
            },
            (error) => {
                setProcessingPlanId(null);
                console.error("Payment Error", error);

                // Clear pending to prevent infinite loading loop on revisit
                localStorage.removeItem('pending_purchase');

                // Show failure Toast
                setToast({
                    message: typeof error === 'string' ? error : "Payment cancelled or failed.",
                    type: 'error'
                });
            }
        );
    }, [user, setView, processingPlanId]);

    // Check for pending purchase on mount (returned from Auth)
    useEffect(() => {
        if (user && !hasTriggeredRef.current) {
            const pendingStr = localStorage.getItem('pending_purchase');
            if (pendingStr) {
                try {
                    const { amount, credits } = JSON.parse(pendingStr);
                    console.log("💳 [Pricing] Resuming pending purchase:", amount);

                    hasTriggeredRef.current = true;
                    // Small delay to ensure UI renders
                    setTimeout(() => handlePurchase(amount, credits), 500);
                } catch (e) {
                    console.error("Error parsing pending purchase", e);
                    localStorage.removeItem('pending_purchase');
                }
            }
        }
    }, [user, handlePurchase]);

    return (
        <PageWrapper>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="animate-fade-in-up">
                <PageHeader
                    badge="Trip Credits"
                    title="Choose Your"
                    highlight="Adventure"
                    description="Flexible pay-as-you-go trip generation. No subscriptions."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 1. FREE - PILOT */}
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8 flex flex-col hover:border-white/30 transition-all group hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] rounded-2xl">
                        <div className="mb-6">
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">Starter</div>
                            <h3 className="text-3xl font-bold text-white mb-2 font-sans">Pilot</h3>
                            <div className="text-xl text-emerald-400 font-bold mb-4 font-mono">Free 🎁</div>
                            <p className="text-xs text-zinc-400 font-sans leading-relaxed">Perfect for your first AI-planned mission.</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1 border-t border-white/10 pt-6">
                            <li className="flex gap-3 text-xs text-zinc-300 font-sans font-bold"><Check className="w-4 h-4 text-emerald-400" /> 1 Free Trip Credit</li>
                            <li className="flex gap-3 text-xs text-zinc-300 font-sans"><Check className="w-4 h-4 text-zinc-500" /> Standard AI Model</li>
                            <li className="flex gap-3 text-xs text-zinc-300 font-sans"><Check className="w-4 h-4 text-zinc-500" /> Basic Itinerary</li>
                        </ul>
                        {/* BUTTON REMOVED / DISABLED as requested */}
                        <div className="w-full py-3 border border-white/5 bg-white/5 text-zinc-500 font-bold uppercase tracking-widest text-[10px] text-center font-sans rounded-lg cursor-not-allowed">
                            Included on Sign Up
                        </div>
                    </div>

                    {/* 2. 99 - EXPLORER */}
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8 flex flex-col hover:border-cyan-400/50 transition-all group hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] rounded-2xl">
                        <div className="mb-6">
                            <div className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2 font-mono">Solo</div>
                            <h3 className="text-3xl font-bold text-white mb-2 font-sans">Explorer</h3>
                            <div className="text-3xl text-white font-bold mb-4 font-sans">₹99</div>
                            <p className="text-xs text-zinc-400 font-sans leading-relaxed">Single premium trip generation.</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1 border-t border-white/10 pt-6">
                            <li className="flex gap-3 text-xs text-white font-sans font-bold"><Check className="w-4 h-4 text-cyan-400" /> 1 Trip Credit</li>
                            <li className="flex gap-3 text-xs text-zinc-300 font-sans"><Check className="w-4 h-4 text-cyan-400" /> Advanced AI Logic</li>
                            <li className="flex gap-3 text-xs text-zinc-300 font-sans"><Check className="w-4 h-4 text-cyan-400" /> Full Customization</li>
                        </ul>
                        <button
                            onClick={() => handlePurchase(99, 1)}
                            disabled={processingPlanId !== null}
                            className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-cyan-400 hover:text-black hover:border-cyan-400 transition-all font-sans rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-white disabled:hover:border-white/10"
                        >
                            {processingPlanId === 99 ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Buy 1 Credit'}
                        </button>
                    </div>

                    {/* 3. 199 - VOYAGEUR (RECOMMENDED) */}
                    <div className="bg-gradient-to-b from-cyan-950/30 to-black backdrop-blur-md border border-cyan-400 p-8 flex flex-col relative overflow-hidden transform md:-translate-y-4 shadow-[0_0_40px_rgba(34,211,238,0.15)] hover:shadow-[0_0_60px_rgba(34,211,238,0.25)] transition-all duration-500 rounded-2xl">
                        <div className="absolute top-0 right-0 bg-cyan-400 text-black text-[9px] font-bold px-3 py-1 uppercase tracking-wider font-mono">Recommended</div>
                        <div className="mb-6 relative z-10">
                            <div className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-2 flex items-center gap-2 font-mono"><Sparkles className="w-3 h-3" /> Best Value</div>
                            <h3 className="text-3xl font-bold text-white mb-2 font-sans">Voyageur</h3>
                            <div className="text-3xl text-white font-bold mb-4 font-sans">₹199</div>
                            <p className="text-xs text-cyan-100/70 font-sans leading-relaxed">Planning multiple getaways?</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1 relative z-10 border-t border-cyan-400/30 pt-6">
                            <li className="flex gap-3 text-xs text-white font-sans font-bold"><Check className="w-4 h-4 text-cyan-400" /> 3 Trip Credits</li>
                            <li className="flex gap-3 text-xs text-white font-sans"><Check className="w-4 h-4 text-cyan-400" /> Save ₹98 instantly</li>
                            <li className="flex gap-3 text-xs text-white font-sans"><Check className="w-4 h-4 text-cyan-400" /> Priority Generation</li>
                            <li className="flex gap-3 text-xs text-white font-sans"><Check className="w-4 h-4 text-cyan-400" /> Travel DNA Analysis</li>
                        </ul>
                        <button
                            onClick={() => handlePurchase(199, 3)}
                            disabled={processingPlanId !== null}
                            className="relative z-10 w-full py-3 bg-cyan-400 text-black font-bold uppercase tracking-widest text-[10px] hover:bg-white hover:scale-105 transition-all font-sans rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {processingPlanId === 199 ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-black" /> : 'Get 3 Credits'}
                        </button>
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/10 to-transparent pointer-events-none" />
                    </div>

                    {/* 4. 299 - GLOBETROTTER */}
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8 flex flex-col hover:border-orange-500/50 transition-all group hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] rounded-2xl">
                        <div className="mb-6">
                            <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 font-mono"><Globe className="w-3 h-3" /> Pro</div>
                            <h3 className="text-3xl font-bold text-white mb-2 font-sans">Nomad</h3>
                            <div className="text-3xl text-white font-bold mb-4 font-sans">₹299</div>
                            <p className="text-xs text-zinc-400 font-sans leading-relaxed">For the serious traveler.</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1 border-t border-white/10 pt-6">
                            <li className="flex gap-3 text-xs text-zinc-300 font-sans font-bold"><Check className="w-4 h-4 text-orange-500" /> 5 Trip Credits</li>
                            <li className="flex gap-3 text-xs text-zinc-300 font-sans"><Check className="w-4 h-4 text-orange-500" /> Maximum Savings</li>
                            <li className="flex gap-3 text-xs text-zinc-300 font-sans"><Check className="w-4 h-4 text-orange-500" /> All Pro Features</li>
                        </ul>
                        <button
                            onClick={() => handlePurchase(299, 5)}
                            disabled={processingPlanId !== null}
                            className="w-full py-3 border border-white/20 text-white font-bold uppercase tracking-widest text-[10px] hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/10 transition-all font-sans rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-white/20 disabled:hover:text-white disabled:hover:bg-transparent"
                        >
                            {processingPlanId === 299 ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Get 5 Credits'}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- SUCCESS MODAL --- */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => {
                        setShowSuccessModal(false);
                        if (localStorage.getItem('voyageur_saved_prompt')) {
                            setView(AppView.PLANNER);
                        } else {
                            setView(AppView.DASHBOARD);
                        }
                    }} />
                    <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-[80px]" />
                        <div className="relative z-10 flex flex-col items-center text-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                <Check className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white uppercase tracking-widest">Payment Successful</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Your credits have been added to your account.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    // NEW: Redirect back to Planner if a prompt was saved
                                    if (localStorage.getItem('voyageur_saved_prompt')) {
                                        setView(AppView.PLANNER);
                                    } else {
                                        setView(AppView.DASHBOARD);
                                    }
                                }}
                                className="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:brightness-110 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                {localStorage.getItem('voyageur_saved_prompt') ? 'Continue Planning' : 'Go to Dashboard'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
};

export default Pricing;
