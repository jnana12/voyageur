
import React, { useState } from 'react';

import { Search, Star, Loader2, Bookmark, Clock, CheckCircle, Utensils } from 'lucide-react';

import { generateDiningOptions } from '../services/geminiService';

import { TripItinerary, DiningRecommendation, UserProfile } from '../types';
import { PageWrapper } from './ui/PageWrapper';
import { PageHeader } from './ui/PageHeader';

interface DiningConciergeProps {
    user: UserProfile | null;
}

const DiningConcierge: React.FC<DiningConciergeProps> = ({ user }) => {

    const [craving, setCraving] = useState('');

    const [recommendations, setRecommendations] = useState<DiningRecommendation[]>([]);

    const [loading, setLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'preorder'>('search');



    const handleSearch = async () => {

        if (!craving.trim()) return;



        // SECURITY CHECK: Prevent API Key submission

        const apiKeyPattern = /(AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{20,})/;

        if (apiKeyPattern.test(craving)) {

            alert("Security Alert: It looks like you pasted an API Key. Please do not submit API keys here.");

            return;

        }



        setLoading(true);

        setRecommendations([]);



        try {
            const results = await generateDiningOptions(craving, user?.preferences);
            setRecommendations(results);

        } catch (e) {

            console.error(e);

        } finally {

            setLoading(false);

        }

    };



    return (

        <PageWrapper>

            <div className="animate-fade-in-up">

                <PageHeader

                    badge="Concierge Service"

                    title="Elite"

                    highlight="Dining"

                    description="Describe your craving. Define the vibe. We secure the table."

                />



                <div className="flex justify-center mb-12">

                    <div className="flex flex-wrap justify-center bg-black p-1 border border-white/10 gap-2 md:gap-0">

                        <button onClick={() => setActiveTab('search')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'search' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Search</button>

                        <button onClick={() => setActiveTab('saved')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'saved' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Saved</button>

                        <button onClick={() => setActiveTab('preorder')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'preorder' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Pre-Order</button>

                    </div>

                </div>



                {activeTab === 'search' && (

                    <>

                        <div className="max-w-2xl mx-auto mb-16 relative w-full">

                            <div className="relative flex flex-col md:flex-row gap-4 md:gap-0">

                                <input

                                    type="text"

                                    value={craving}

                                    onChange={(e) => setCraving(e.target.value)}

                                    placeholder="e.g. Authentic sushi in Tokyo..."

                                    className="flex-1 bg-black/50 backdrop-blur-md border border-white/20 px-6 py-4 text-white focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_30px_rgba(34,211,238,0.1)] transition-all placeholder-zinc-600 font-sans text-lg"

                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}

                                />

                                <button

                                    onClick={handleSearch}

                                    disabled={loading}

                                    className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-50"

                                >

                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SEARCH'}

                                </button>

                            </div>

                        </div>



                        <div className="grid md:grid-cols-3 gap-6">

                            {recommendations.map((rec, idx) => (

                                <div key={idx} className="border border-white/10 bg-black/80 backdrop-blur-md hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] transition-all group duration-300 mx-auto w-full max-w-sm md:max-w-none">

                                    <div className="p-6">

                                        <div className="flex justify-between items-start mb-2">

                                            <h3 className="text-xl font-bold text-white uppercase font-sans tracking-tight">{rec.restaurantName}</h3>

                                            <div className="flex flex-col items-end gap-2">

                                                <span className="text-sm text-cyan-400 font-mono bg-cyan-950/30 px-2 py-1 border border-cyan-900/50">{rec.price}</span>

                                                <div className="bg-black/80 backdrop-blur px-2 py-1 text-xs font-bold text-white flex items-center gap-1 border border-white/20">

                                                    <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {rec.rating}

                                                </div>

                                            </div>

                                        </div>

                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wide mb-4 font-mono">{rec.cuisine} • {rec.ambiance}</p>

                                        <div className="bg-white/5 border border-white/10 p-4 mb-6">

                                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider">Signature Dish</p>

                                            <p className="text-zinc-200 text-sm font-sans flex items-center gap-2">

                                                <Utensils className="w-4 h-4 text-cyan-400" /> {rec.dishName}

                                            </p>

                                        </div>

                                        <p className="text-zinc-400 text-sm mb-6 line-clamp-3 font-sans leading-relaxed">{rec.description}</p>

                                        <button className="w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 transition-colors">

                                            Reserve Table

                                        </button>

                                    </div>

                                </div>

                            ))}

                        </div>

                    </>

                )}

                {activeTab === 'saved' && (
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Mock Saved Item 1 */}
                        <div className="border border-white/10 bg-black/80 backdrop-blur-md group relative hover:border-emerald-400/50 transition-all p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase mb-1 font-sans">The Alchemist</h3>
                                    <p className="text-zinc-500 text-xs font-mono">Molecular Mixology • London</p>
                                </div>
                                <div className="bg-emerald-500 text-black px-2 py-1 text-[10px] font-bold uppercase tracking-wider">Open Now</div>
                            </div>
                            <button className="w-full py-3 border border-white/20 text-white hover:bg-white hover:text-black text-xs font-bold uppercase tracking-widest transition-colors">Book Now</button>
                        </div>
                        {/* Mock Saved Item 2 */}
                        <div className="border border-white/10 bg-black/80 backdrop-blur-md group relative hover:border-orange-400/50 transition-all p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase mb-1 font-sans">Nobu Tokyo</h3>
                                    <p className="text-zinc-500 text-xs font-mono">Japanese Fusion • Tokyo</p>
                                </div>
                                <div className="bg-red-500 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider">Closed</div>
                            </div>
                            <button className="w-full py-3 border border-white/20 text-white hover:bg-white hover:text-black text-xs font-bold uppercase tracking-widest transition-colors">View Menu</button>
                        </div>
                    </div>
                )}

                {activeTab === 'preorder' && (
                    <div className="max-w-2xl mx-auto border border-white/10 bg-black p-8">
                        <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Order Active</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white uppercase">Order #8821</h3>
                                <p className="text-zinc-500 font-mono text-sm">Est. Arrival: 19:45</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-white">$145.00</div>
                                <div className="text-xs text-zinc-500 uppercase">Paid via Wallet</div>
                            </div>
                        </div>

                        <div className="space-y-8 relative">
                            {/* Timeline Line */}
                            <div className="absolute left-3 top-2 bottom-2 w-px bg-zinc-800" />

                            <div className="flex gap-6 relative">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 border-4 border-black z-10 flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3 text-black" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase">Order Confirmed</h4>
                                    <p className="text-xs text-zinc-500 font-mono">18:30 • Payment processed</p>
                                </div>
                            </div>
                            <div className="flex gap-6 relative">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 border-4 border-black z-10 flex items-center justify-center">
                                    <Clock className="w-3 h-3 text-black" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase">Preparing</h4>
                                    <p className="text-xs text-zinc-500 font-mono">18:45 • Chef initiated</p>
                                </div>
                            </div>
                            <div className="flex gap-6 relative">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 border-4 border-black z-10" />
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-500 uppercase">Ready for Pickup</h4>
                                    <p className="text-xs text-zinc-600 font-mono">Est. 19:45</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageWrapper>
    );
};

export default DiningConcierge;
