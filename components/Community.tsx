
import React from 'react';
import { User, Heart, Share2, MapPin, Globe, TrendingUp } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';
import { PageHeader } from './ui/PageHeader';

const Community: React.FC = () => {
    const posts = [
        {
            user: "Sarah Jenkins",
            location: "Kyoto, Japan",
            title: "Hidden Temples & Matcha Spots",
            likes: 234,
            image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80",
            tags: ["Culture", "Solo Travel"]
        },
        {
            user: "Marcus Chen",
            location: "Reykjavik, Iceland",
            title: "Aurora Hunting Guide 2024",
            likes: 892,
            image: "https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&q=80",
            tags: ["Adventure", "Photography"]
        },
        {
            user: "Elena Rodriguez",
            location: "Amalfi Coast, Italy",
            title: "Pasta, Wine & Sunsets",
            likes: 567,
            image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80",
            tags: ["Foodie", "Luxury"]
        }
    ];

    const creators = [
        { name: "Alex V.", followers: "12k", role: "Photographer", img: "https://i.pravatar.cc/100?img=11" },
        { name: "Mia S.", followers: "8.5k", role: "Food Critic", img: "https://i.pravatar.cc/100?img=5" },
        { name: "David K.", followers: "24k", role: "Alpinist", img: "https://i.pravatar.cc/100?img=3" },
    ];

    return (
        <PageWrapper>
            <div className="animate-fade-in-up">
                <PageHeader
                    badge="Global Network"
                    title="Voyageur"
                    highlight="Community"
                    description="Explore curated itineraries from our top explorers."
                />

                {/* Featured Creators Section */}
                <div className="mb-12 md:mb-20">
                    <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                            <User className="w-5 h-5 text-cyan-400" /> Featured Creators
                        </h3>
                        <button className="text-xs text-zinc-500 font-bold uppercase hover:text-white transition-colors">View All</button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {creators.map((c, i) => (
                            <div key={i} className="bg-black/50 backdrop-blur-md border border-white/10 p-6 flex items-center gap-4 hover:border-cyan-400/50 transition-all group cursor-pointer hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] rounded-xl">
                                <img src={c.img} alt={c.name} className="w-16 h-16 rounded-full border-2 border-white/10 group-hover:border-cyan-400 transition-all grayscale group-hover:grayscale-0" />
                                <div>
                                    <h4 className="font-bold text-white text-lg uppercase font-sans tracking-tight">{c.name}</h4>
                                    <div className="text-xs text-cyan-400 font-mono mb-1">{c.role}</div>
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{c.followers} Followers</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" /> Trending Itineraries
                </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12 md:mb-20">
                {posts.map((post, idx) => (
                    <div key={idx} className="bg-black/50 backdrop-blur-md border border-white/10 group hover:border-cyan-400/50 transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                        <div className="h-64 overflow-hidden relative">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute top-4 left-4 flex gap-2">
                                {post.tags.map(tag => (
                                    <span key={tag} className="bg-black/80 backdrop-blur border border-white/20 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wide group-hover:border-cyan-400/50 transition-colors">{tag}</span>
                                ))}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-cyan-400/30 transition-colors">
                                    <User className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white uppercase font-sans tracking-wide">{post.user}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 group-hover:text-cyan-400/70 transition-colors">
                                        <MapPin className="w-3 h-3" /> {post.location}
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 uppercase leading-tight group-hover:text-cyan-400 transition-colors font-sans tracking-tight">{post.title}</h3>
                            <div className="flex items-center justify-between border-t border-white/10 pt-4">
                                <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-red-400 uppercase transition-colors group/btn">
                                    <Heart className="w-4 h-4 group-hover/btn:fill-current" /> {post.likes}
                                </button>
                                <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white uppercase transition-colors">
                                    <Share2 className="w-4 h-4" /> Share
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Map Placeholder */}
            <div className="bg-black border border-white/10 p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center opacity-20 invert transition-transform duration-[10s] group-hover:scale-110" />
                <div className="relative z-10 text-center py-12">
                    <Globe className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white uppercase mb-2">Global Heatmap</h3>
                    <p className="text-zinc-500 mb-8 max-w-md mx-auto">See where our community is traveling right now.</p>
                    <button className="px-8 py-3 border border-white/20 text-white font-bold uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-colors">Open Map View</button>
                </div>
            </div>
        </PageWrapper>
    );
};

export default Community;
