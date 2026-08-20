import React, { useState } from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';

const Marketplace: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState("All");

    const categories = ["All", "Transport", "Connectivity", "Accessories", "Experience"];

    const items = [
        {
            title: "JR Rail Pass (7 Days)",
            price: "$245.00",
            category: "Transport",
            image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80"
        },
        {
            title: "Global eSIM Data Pack",
            price: "$35.00",
            category: "Connectivity",
            image: "https://images.unsplash.com/photo-1512428559087-560fa0db99b2?auto=format&fit=crop&q=80"
        },
        {
            title: "Voyageur Travel Kit",
            price: "$89.00",
            category: "Accessories",
            image: "https://images.unsplash.com/photo-1521587760-4025a4d041c5?auto=format&fit=crop&q=80"
        },
        {
            title: "Kyoto Tea Ceremony",
            price: "$120.00",
            category: "Experience",
            image: "https://images.unsplash.com/photo-1531263060782-b024de9b9793?auto=format&fit=crop&q=80"
        },
        {
            title: "Noise Cancelling Headphones",
            price: "$299.00",
            category: "Accessories",
            image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80"
        },
        {
            title: "Private Airport Transfer",
            price: "$60.00",
            category: "Transport",
            image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80"
        }
    ];

    const filteredItems = activeCategory === "All" ? items : items.filter(i => i.category === activeCategory);

    return (
        <PageWrapper>
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/10 pb-8 animate-fade-in-up">
                <div className="w-full text-left">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 uppercase tracking-tight font-sans">Marketplace</h2>
                    <p className="text-zinc-400">Exclusive gear and experiences for members.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-bold uppercase text-xs hover:bg-white hover:text-black transition-colors font-sans tracking-wider mt-4 md:mt-0 w-full md:w-auto justify-center">
                    <ShoppingBag className="w-4 h-4" /> View Cart
                </button>
            </div>

            {/* Featured Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 md:p-8 mb-12 relative overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.3)] animate-fade-in-up delay-100">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="bg-black/80 backdrop-blur text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest w-fit mb-3 border border-white/20 rounded-full">Limited Time Deal</div>
                        <h3 className="text-3xl font-bold text-white uppercase leading-none font-sans tracking-tight">Voyageur Elite Kit</h3>
                        <p className="text-white/90 font-bold mt-2 font-sans">Get 50% off when you book a trip today.</p>
                    </div>
                    <button className="px-8 py-3 bg-white text-black font-bold uppercase text-xs tracking-wider hover:bg-black hover:text-white transition-colors shadow-lg w-full md:w-auto">
                        Claim Offer
                    </button>
                </div>
                <div className="absolute top-0 right-0 p-32 bg-white/20 blur-[50px] mix-blend-overlay" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-12 animate-fade-in-up delay-200">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-2 border text-xs font-bold uppercase tracking-wider transition-all ${activeCategory === cat
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-zinc-500 border-white/10 hover:border-white/50 hover:text-white'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grid md:grid-cols-4 gap-6 animate-fade-in-up delay-300">
                {filteredItems.map((item, idx) => (
                    <div key={idx} className="bg-black/50 backdrop-blur-md border border-white/10 group hover:border-cyan-400/50 transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                        <div className="h-64 overflow-hidden relative">
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute top-0 right-0 bg-cyan-400 text-black px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-lg">
                                {item.category}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-white uppercase leading-tight font-sans tracking-tight">{item.title}</h3>
                            </div>
                            <div className="flex justify-between items-center mt-4">
                                <span className="text-xl font-bold text-white font-mono">{item.price}</span>
                                <button className="p-2 border border-white/20 hover:bg-white hover:text-black transition-colors group-hover:border-cyan-400/50">
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </PageWrapper>
    );
};

export default Marketplace;
