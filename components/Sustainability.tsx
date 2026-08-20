import React, { useState } from 'react';
import { Leaf, Wind, Droplets, ArrowUpRight, Calculator, RefreshCw } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';

const CARBON_FACTOR = 0.14;

const Sustainability: React.FC = () => {
    const [calcDistance, setCalcDistance] = useState(1000);

    return (
        <PageWrapper>
            <div className="grid md:grid-cols-2 gap-12 items-center mb-20 animate-fade-in-up">
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-4 justify-start">
                        <Leaf className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                        <span className="text-emerald-400 font-mono text-sm uppercase tracking-wider">Eco-Initiative</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 uppercase tracking-tight font-sans">Carbon Neutral <br />Travel.</h2>
                    <p className="text-zinc-400 text-lg leading-relaxed mb-8 font-sans">
                        We automatically calculate the carbon footprint of your flights and stays, offering instant offset options through verified reforestation projects.
                    </p>
                    <button className="px-8 py-4 bg-emerald-500 text-black font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        View My Impact
                    </button>
                </div>
                <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8 relative rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                    <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[100px]" />
                    <div className="relative z-10 grid grid-cols-2 gap-8">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2 font-sans tracking-tight">2.4t</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono">CO2 Offset</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2 font-sans tracking-tight">12</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Trees Planted</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Carbon Calculator Stub */}
            <div className="bg-zinc-900/30 backdrop-blur-md border border-white/10 p-8 mb-16 rounded-2xl">
                <h3 className="text-lg font-bold text-white uppercase mb-6 flex items-center gap-2 font-sans">
                    <Calculator className="w-5 h-5 text-emerald-400" /> Quick Calculator
                </h3>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-zinc-500 uppercase block mb-2 font-mono">Flight Distance (Miles)</label>
                        <input
                            type="range"
                            min="100"
                            max="10000"
                            step="100"
                            value={calcDistance}
                            onChange={(e) => setCalcDistance(parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1 bg-zinc-700 appearance-none cursor-pointer rounded-full"
                        />
                        <div className="mt-2 text-right text-emerald-400 font-mono">{calcDistance} mi</div>
                    </div>
                    <div className="flex-1 w-full text-center md:text-left border-l border-white/10 md:pl-8">
                        <div className="text-3xl font-bold text-white mb-1 font-sans">{(calcDistance * CARBON_FACTOR).toFixed(1)} kg</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Est. CO2 Emission</div>
                    </div>
                    <button className="px-6 py-3 border border-emerald-500/30 text-emerald-400 font-bold uppercase text-xs hover:bg-emerald-500 hover:text-black transition-colors font-sans tracking-wide">
                        Offset Now
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8 hover:border-emerald-500/50 transition-all group hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] rounded-xl">
                    <Wind className="w-8 h-8 text-emerald-400 mb-6 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <h3 className="text-xl font-bold text-white uppercase mb-2 font-sans tracking-tight">Clean Energy Flights</h3>
                    <p className="text-zinc-500 text-sm mb-6 font-sans">Prioritize airlines using SAF (Sustainable Aviation Fuel).</p>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider group-hover:gap-4 transition-all cursor-pointer">
                        Learn More <ArrowUpRight className="w-3 h-3" />
                    </div>
                </div>
                <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8 hover:border-emerald-500/50 transition-all group hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] rounded-xl">
                    <Leaf className="w-8 h-8 text-emerald-400 mb-6 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <h3 className="text-xl font-bold text-white uppercase mb-2 font-sans tracking-tight">Eco-Certified Stays</h3>
                    <p className="text-zinc-500 text-sm mb-6 font-sans">Hotels verified for waste reduction and energy efficiency.</p>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider group-hover:gap-4 transition-all cursor-pointer">
                        Browse Hotels <ArrowUpRight className="w-3 h-3" />
                    </div>
                </div>
                <div className="bg-black/50 backdrop-blur-md border border-white/10 p-8 hover:border-emerald-500/50 transition-all group hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] rounded-xl">
                    <Droplets className="w-8 h-8 text-emerald-400 mb-6 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <h3 className="text-xl font-bold text-white uppercase mb-2 font-sans tracking-tight">Ocean Preservation</h3>
                    <p className="text-zinc-500 text-sm mb-6 font-sans">Direct donations to marine cleanup initiatives.</p>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider group-hover:gap-4 transition-all cursor-pointer">
                        Donate <ArrowUpRight className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default Sustainability;
