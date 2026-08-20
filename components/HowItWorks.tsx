import React from 'react';
import { MessageSquare, Cpu, UserCheck, Plane } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';
import { PageHeader } from './ui/PageHeader';

const HowItWorks: React.FC = () => {
    const steps = [
        {
            icon: <MessageSquare className="w-6 h-6 text-white" />,
            title: "1. The Prompt",
            desc: "Tell us about your dream weekend. Be as vague ('Beach trip') or specific ('Tokyo jazz bars and sushi') as you like.",
            color: "bg-cyan-500"
        },
        {
            icon: <Cpu className="w-6 h-6 text-white" />,
            title: "2. The Draft",
            desc: "Our Gemini AI engine constructs a logistical framework in seconds, checking opening times, distances, and budgets.",
            color: "bg-teal-500"
        },
        {
            icon: <UserCheck className="w-6 h-6 text-white" />,
            title: "3. The Review",
            desc: "A local expert reviews the plan. They spot that the museum is closed for renovations or that the restaurant went downhill.",
            color: "bg-orange-500"
        },
        {
            icon: <Plane className="w-6 h-6 text-white" />,
            title: "4. The Execution",
            desc: "We book everything. You get a dynamic digital itinerary that updates in real-time if flights change.",
            color: "bg-emerald-500"
        }
    ];

    return (
        <PageWrapper>
            <div className="animate-fade-in-up">
                <PageHeader 
                    badge="Workflow"
                    title="From Thought To"
                    highlight="Tarmac"
                    description="A seamless journey from your first idea to your final destination."
                />

            <div className="relative">                {/* Vertical Line */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/50 via-orange-500/50 to-transparent hidden md:block" />

                <div className="space-y-12 relative z-10 w-full">
                    {steps.map((step, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-0 items-center w-full">

                            {/* Left Content (Evens) */}
                            <div className={`order-2 md:order-1 md:text-right md:pr-4 ${idx % 2 === 0 ? 'block text-center' : 'hidden md:block invisible'}`}>
                                {idx % 2 === 0 && (
                                    <>
                                        <h3 className="text-2xl font-bold text-white mb-2 font-sans tracking-tight">{step.title}</h3>
                                        <p className="text-zinc-400 font-sans leading-relaxed">{step.desc}</p>
                                    </>
                                )}
                            </div>

                            {/* Center Icon */}
                            <div className="order-1 md:order-2 flex justify-center relative z-20 my-4 md:my-0">
                                <div className="w-12 h-12 rounded-full border-4 border-black shadow-[0_0_20px_rgba(34,211,238,0.2)] flex items-center justify-center bg-black relative z-10">
                                    <div className={`w-full h-full rounded-full flex items-center justify-center ${step.color} shadow-inner bg-opacity-20 backdrop-blur-sm border border-white/20`}>
                                        {step.icon}
                                    </div>
                                </div>
                            </div>

                            {/* Right Content (Odds) */}
                            <div className={`order-3 md:order-3 md:text-left md:pl-4 ${idx % 2 !== 0 ? 'block text-center' : 'hidden md:block invisible'}`}>
                                {idx % 2 !== 0 && (
                                    <>
                                        <h3 className="text-2xl font-bold text-white mb-2 font-sans tracking-tight">{step.title}</h3>
                                        <p className="text-zinc-400 font-sans leading-relaxed">{step.desc}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-24 bg-slate-900/50 rounded-2xl p-8 border border-white/5 text-center">
                <h3 className="text-2xl font-bold text-white mb-4">Ready to go?</h3>
                <p className="text-slate-400 mb-8">Try the planner today. No account needed for the first draft.</p>
                <button onClick={() => {/* Add navigation logic here */ }} className="px-8 py-4 bg-white text-black rounded-xl font-bold hover:bg-cyan-50 transition-colors">Start Planning</button>
            </div>
            </div>
        </PageWrapper>
    );
};

export default HowItWorks;