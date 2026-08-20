import React from 'react';
import { Shield, Cpu, Users, Globe } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';
import { PageHeader } from './ui/PageHeader';

const About: React.FC = () => {
  return (
    <PageWrapper>
      <div className="animate-fade-in-up">
        {/* Header */}
        <PageHeader 
            badge="Our Mission"
            title="Human & Machine"
            highlight="Collaboration"
            description="We believe AI shouldn't replace human taste—it should amplify it. Voyageur is the first platform that combines generative power with concierge-level human verification."
        />

      {/* Grid */}
      <div className="grid md:grid-cols-2 gap-12 mb-24">        <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:bg-slate-900/60 transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] mx-auto max-w-lg md:max-w-none">
          <div className="absolute top-0 right-0 p-12 bg-cyan-500/10 blur-3xl rounded-full group-hover:bg-cyan-500/20 transition-colors" />
          <Cpu className="w-12 h-12 text-cyan-400 mb-6 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          <h3 className="text-3xl font-bold text-white mb-4 font-sans">The Engine</h3>
          <p className="text-zinc-400 leading-relaxed mb-6 font-sans">
            Our Gemini-powered core processes millions of flight paths, hotel reviews, and local events in seconds. It builds the skeleton of your trip with mathematical precision, optimizing for travel time and budget constraints.
          </p>
          <ul className="space-y-2 text-sm text-zinc-300 font-sans">
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]" /> Real-time availability checks</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]" /> Dynamic weather adaptation</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]" /> Cost prediction models</li>
          </ul>
        </div>

        <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:bg-slate-900/60 transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] mx-auto max-w-lg md:max-w-none">
          <div className="absolute top-0 right-0 p-12 bg-orange-500/10 blur-3xl rounded-full group-hover:bg-orange-500/20 transition-colors" />
          <Users className="w-12 h-12 text-orange-400 mb-6 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
          <h3 className="text-3xl font-bold text-white mb-4 font-sans">The Curators</h3>
          <p className="text-zinc-400 leading-relaxed mb-6 font-sans">
            Algorithms can't taste the wine or feel the vibe of a jazz club. Our network of local experts in 50+ cities verifies every itinerary. They swap out the "tourist traps" for the hidden gems that only locals know.
          </p>
          <ul className="space-y-2 text-sm text-zinc-300 font-sans">
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(249,115,22,0.8)]" /> Vibe checks & atmosphere verification</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(249,115,22,0.8)]" /> Exclusive reservation access</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(249,115,22,0.8)]" /> 24/7 on-trip support</li>
          </ul>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-white/5 py-12">
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-2">50+</div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Global Cities</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-2">24h</div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Turnaround Time</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-2">10k+</div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Trips Planned</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-2">99%</div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Satisfaction</div>
        </div>
      </div>
      </div>
    </PageWrapper>
  );
};

export default About;