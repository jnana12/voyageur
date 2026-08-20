
import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { PageWrapper } from './ui/PageWrapper';
import { PageHeader } from './ui/PageHeader';

const Blog: React.FC = () => {
    const posts = [
        {
            title: "5 Days in Mangalore: The Hidden Coastal Gem",
            category: "Itinerary",
            time: "5 min read",
            image: "https://images.unsplash.com/photo-1590050752117-238cb0fb5689?auto=format&fit=crop&q=80",
            excerpt: "Explore pristine beaches, ancient temples, and spicy seafood curries in this comprehensive guide."
        },
        {
            title: "How AI is Reshaping Luxury Travel",
            category: "Technology",
            time: "3 min read",
            image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80",
            excerpt: "Why the human-in-the-loop model provides the perfect balance of efficiency and taste."
        },
        {
            title: "Top 10 Secret Beaches in India",
            category: "Discovery",
            time: "7 min read",
            image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80",
            excerpt: "Escape the crowds. We reveal the untouched shorelines you won't find on standard maps."
        },
        {
            title: "The Ultimate Tokyo Jazz Bar Guide",
            category: "Nightlife",
            time: "6 min read",
            image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80",
            excerpt: "Where to find the best highballs and vinyl collections in the neon city."
        }
    ];

    return (
        <PageWrapper>
            <div className="animate-fade-in-up">
                <PageHeader 
                    badge="Journal"
                    title="Transmission"
                    highlight="Log"
                    description="Intel and guides from the Voyageur network."
                />

                <div className="mb-16 border-b border-white/10 pb-8 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 text-center md:text-left">                <div></div>
                <div className="flex gap-2 justify-center md:justify-start flex-wrap">
                    {['All', 'Itineraries', 'Tech', 'Dining'].map(cat => (
                        <button key={cat} className="px-4 py-2 border border-white/10 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:border-white transition-colors">
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {posts.map((post, idx) => (
                    <div key={idx} className="group cursor-pointer border border-white/10 bg-black/50 backdrop-blur-md hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] transition-all duration-500">
                        <div className="h-64 overflow-hidden relative">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur px-3 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border border-white/10">
                                {post.category}
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono mb-3">
                                <Clock className="w-3 h-3" /> {post.time}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4 uppercase leading-tight group-hover:text-cyan-400 transition-colors font-sans tracking-tight">{post.title}</h3>
                            <p className="text-zinc-400 mb-6 leading-relaxed line-clamp-2 font-sans">{post.excerpt}</p>
                            <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all group-hover:text-cyan-400">
                                Read Article <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            </div>
        </PageWrapper>
    );
};

export default Blog;
