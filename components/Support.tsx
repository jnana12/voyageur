
import React from 'react';
import { MessageSquare, Mail, Search, ChevronDown, Phone } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';
import { PageHeader } from './ui/PageHeader';

const Support: React.FC = () => {
    return (
        <PageWrapper>
            <div className="animate-fade-in-up">
                <PageHeader 
                    badge="Contact"
                    title="Global"
                    highlight="Support"
                    description="We're here to help, anytime, anywhere."
                />
                
                <div className="relative max-w-lg mx-auto mb-16">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input type="text" placeholder="Search knowledge base..." className="w-full bg-black/50 backdrop-blur-md border border-white/20 pl-12 pr-4 py-4 text-white focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all font-sans text-sm rounded-lg" />
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-16 animate-fade-in-up delay-100">
                <div
                    className="bg-black/50 backdrop-blur-md border border-white/10 p-6 hover:border-cyan-400/50 transition-all text-center group cursor-pointer hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] rounded-xl mx-auto w-full max-w-sm md:max-w-none"
                    role="button"
                    tabIndex={0}
                    aria-label="Start Live Chat"
                    onClick={() => alert("Live Chat feature coming soon!")}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && alert("Live Chat feature coming soon!")}
                >
                    <MessageSquare className="w-8 h-8 text-cyan-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    <h3 className="text-lg font-bold text-white uppercase mb-2 font-sans">Live Chat</h3>
                    <p className="text-zinc-500 text-sm font-sans">24/7 Agent Support</p>
                </div>
                <div
                    className="bg-black/50 backdrop-blur-md border border-white/10 p-6 hover:border-cyan-400/50 transition-all text-center group cursor-pointer hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] rounded-xl mx-auto w-full max-w-sm md:max-w-none"
                    role="button"
                    tabIndex={0}
                    aria-label="Send Email Ticket"
                    onClick={() => window.location.href = "mailto:support@voyageur.ai"}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (window.location.href = "mailto:support@voyageur.ai")}
                >
                    <Mail className="w-8 h-8 text-cyan-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    <h3 className="text-lg font-bold text-white uppercase mb-2 font-sans">Email Ticket</h3>
                    <p className="text-zinc-500 text-sm font-sans">Response in 2h</p>
                </div>
                <div
                    className="bg-black/50 backdrop-blur-md border border-white/10 p-6 hover:border-cyan-400/50 transition-all text-center group cursor-pointer hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] rounded-xl mx-auto w-full max-w-sm md:max-w-none"
                    role="button"
                    tabIndex={0}
                    aria-label="Call Emergency Priority Line"
                    onClick={() => window.location.href = "tel:+18005550199"}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (window.location.href = "tel:+18005550199")}
                >
                    <Phone className="w-8 h-8 text-cyan-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    <h3 className="text-lg font-bold text-white uppercase mb-2 font-sans">Emergency</h3>
                    <p className="text-zinc-500 text-sm font-sans">Priority Line</p>
                </div>
            </div>

            <div className="border-t border-white/10 pt-12">
                <h3 className="text-xl font-bold text-white mb-8 uppercase">Frequently Asked Questions</h3>
                <div className="space-y-4">
                    <FAQItem q="How do I modify a booked itinerary?" a="Contact the concierge via chat. Changes within 24h of travel may incur fees." />
                    <FAQItem q="Is my data shared with third parties?" a="No. We only share necessary details with airlines and hotels for booking purposes." />
                    <FAQItem q="How do Voyager Points work?" a="Earn points for every dollar spent. Redeem them for discounts or exclusive experiences." />
                    <FAQItem q="Can I add a co-traveler after booking?" a="Yes, navigate to the 'Trips' page and select 'Manage Travelers'." />
                </div>
            </div>
        </PageWrapper>
    );
};

const FAQItem = ({ q, a }: { q: string, a: string }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div
            className="border border-white/10 bg-black/50 backdrop-blur-sm p-6 cursor-pointer hover:bg-white/5 transition-all group hover:border-white/30 rounded-lg"
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
        >
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-white text-sm uppercase tracking-wide group-hover:text-cyan-400 transition-colors font-sans">{q}</h4>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && <p className="text-zinc-400 text-sm leading-relaxed font-sans">{a}</p>}
        </div>
    );
};

export default Support;
