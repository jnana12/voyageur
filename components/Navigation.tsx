
import React, { useEffect, useState, useRef } from 'react';
import { User, Menu, X, ChevronRight, LayoutDashboard, Plus, UtensilsCrossed, Settings, LogOut, Trash2, AlertTriangle, Loader2, CreditCard, Award, HelpCircle, BookOpen, Crown, Users, ShoppingBag, Leaf, Link, Share2, Medal } from 'lucide-react';
import { AppView, UserProfile } from '../types';
import { authService } from '../services/authService';

interface NavigationProps {
    currentView: AppView;
    setView: (view: AppView) => void;
    isLoggedIn: boolean;
    setIsLoggedIn: (value: boolean) => void;
    isVisible?: boolean;
    user: UserProfile | null;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, isLoggedIn, setIsLoggedIn, user, isVisible }) => {
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isHidden, setIsHidden] = useState(false);

    const lastScrollY = useRef(0);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true);
        }, 100);

        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;

                    if (currentScrollY < 50 || mobileMenuOpen) {
                        setIsHidden(false);
                        lastScrollY.current = currentScrollY;
                        ticking = false;
                        return;
                    }

                    const diff = currentScrollY - lastScrollY.current;

                    if (diff > 50) {
                        setIsHidden(true);
                        setUserMenuOpen(false); // Close dropdown on scroll
                        lastScrollY.current = currentScrollY;
                    } else if (diff < -50) {
                        setIsHidden(false);
                        lastScrollY.current = currentScrollY;
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [mobileMenuOpen]);



    const loggedOutNavItems = [
        { label: 'Planner', view: AppView.PLANNER, icon: null },
        { label: 'Concierge', view: AppView.DINING, icon: null },
        { label: 'Pricing', view: AppView.PRICING, icon: null },
        { label: 'Blog', view: AppView.BLOG, icon: null },
        { label: 'Community', view: AppView.COMMUNITY, icon: null },
    ];

    const loggedInNavItems = [
        { label: 'Dashboard', view: AppView.DASHBOARD, icon: <LayoutDashboard className="w-4 h-4" /> },
        { label: 'New Trip', view: AppView.PLANNER, icon: <Plus className="w-4 h-4" /> },
        { label: 'Concierge', view: AppView.DINING, icon: <UtensilsCrossed className="w-4 h-4" /> },
        { label: 'Get Credits', view: AppView.PRICING, icon: <CreditCard className="w-4 h-4" /> },
    ];

    const navItems = isLoggedIn ? loggedInNavItems : loggedOutNavItems;

    return (
        <>
            <nav
                className={`fixed z-[1000] flex items-start justify-center top-0 left-0 right-0 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] pt-4 md:pt-6 will-change-transform
            ${mounted && !isHidden && isVisible !== false ? 'translate-y-0' : '-translate-y-[150%]'}`}
            >
                <div
                    className={`relative w-[95%] max-w-[1200px] bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.5)] pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
            ${mobileMenuOpen ? 'max-h-[800px] overflow-hidden' : 'max-h-[64px] md:overflow-visible overflow-hidden'}
            `}
                >

                    {/* HEADER ROW (Always Visible) */}
                    <div className="flex items-center justify-between w-full h-[64px] px-4 md:px-8 relative z-[1001]">
                        {/* Logo Container - Modern Redesign */}
                        <div
                            className="relative flex items-center gap-4 cursor-pointer group pointer-events-auto"
                            onClick={() => {
                                if (isLoggedIn) setView(AppView.DASHBOARD);
                                else setView(AppView.LANDING);
                                setMobileMenuOpen(false);
                            }}
                        >
                            {/* Abstract Modern Logo */}
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                <div className="absolute inset-0 bg-cyan-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                                    <path d="M16 2L2 9L16 16L30 9L16 2Z" className="fill-white group-hover:fill-cyan-400 transition-colors" />
                                    <path d="M2 14L16 21L30 14" stroke="currentColor" strokeWidth="2" className="text-white/50 group-hover:text-cyan-400/50 transition-colors" />
                                    <path d="M16 21V30" stroke="currentColor" strokeWidth="2" className="text-cyan-500" />
                                </svg>
                            </div>

                            <div className="flex flex-col justify-center">
                                <span className="font-bold text-lg text-white tracking-tighter uppercase leading-none group-hover:text-cyan-400 transition-colors">
                                    Voyageur
                                </span>
                                <span className="text-[9px] font-mono text-zinc-500 tracking-[0.2em] uppercase leading-none">
                                    System v2.5
                                </span>
                            </div>
                        </div>

                        {/* Mobile User Info (before menu button) */}
                        {isLoggedIn && (
                            <div className="md:hidden flex items-center gap-2 mr-2 pointer-events-auto">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded">
                                    <CreditCard className="w-3 h-3 text-cyan-400" />
                                    <span className="text-[10px] font-mono font-bold text-cyan-400">{user?.credits ?? 0}</span>
                                </div>
                                <span className="text-[10px] font-bold text-white uppercase truncate max-w-[60px]">{(user?.fullName || 'User').split(' ')[0]}</span>
                            </div>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            className="md:hidden relative p-2 text-white hover:bg-white hover:text-black transition-colors pointer-events-auto z-[1002]"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <div className="relative w-5 h-5">
                                <span className={`absolute inset-0 transform transition-all duration-300 ${mobileMenuOpen ? 'rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'}`}>
                                    <Menu className="w-5 h-5" />
                                </span>
                                <span className={`absolute inset-0 transform transition-all duration-300 ${mobileMenuOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-50'}`}>
                                    <X className="w-5 h-5" />
                                </span>
                            </div>
                        </button>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-8 pl-2 relative z-[1002] pointer-events-auto">
                            {/* Desktop Navigation Links (Inline Right) */}
                            <div className="flex items-center gap-8 h-full">
                                {navItems.map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setView(item.view);
                                        }}
                                        className={`text-xs font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer pointer-events-auto relative group py-2 ${currentView === item.view
                                            ? 'text-cyan-400'
                                            : 'text-zinc-500 hover:text-white'
                                            }`}
                                    >
                                        {item.label}
                                        <span className={`absolute bottom-0 left-0 w-full h-[1px] bg-cyan-400 transform origin-left transition-transform duration-300 ${currentView === item.view ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`} />
                                    </button>
                                ))}
                            </div>

                            <div className="w-px h-6 bg-white/10 mx-2" />

                            {!isLoggedIn ? (
                                <button
                                    onClick={() => setView(AppView.AUTH)}
                                    className="group relative bg-white text-black px-6 h-[36px] text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center gap-2 cursor-pointer pointer-events-auto"
                                >
                                    Sign In
                                </button>
                            ) : (
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className={`group relative h-[36px] px-4 border flex items-center justify-center gap-2 cursor-pointer pointer-events-auto transition-colors ${userMenuOpen ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/20 hover:border-cyan-400 hover:text-cyan-400'}`}
                                    >
                                        <div className="flex items-center gap-2 mr-1 border-r border-white/20 pr-2">
                                            <CreditCard className="w-3 h-3 text-cyan-400" />
                                            <span className="text-xs font-mono font-bold text-cyan-400">{user?.credits ?? 0}</span>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider">{(user?.fullName || 'User').split(' ')[0]}</span>
                                        <User className="w-3 h-3" />
                                    </button>

                                    {/* Dropdown Menu - High Z-Index */}
                                    <div className={`absolute top-[120%] right-0 mt-0 w-64 bg-black border border-white/20 p-0 transition-all duration-200 origin-top-right transform z-[1100] shadow-2xl ${userMenuOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                        <div className="max-h-[80vh] overflow-y-auto">
                                            <button onClick={() => { setView(AppView.DASHBOARD); setUserMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-white hover:text-black text-xs font-bold text-white uppercase tracking-wider transition-colors flex items-center justify-start gap-3 border-b border-white/10">
                                                <LayoutDashboard className="w-3 h-3" /> Dashboard
                                            </button>

                                            <div className="py-2 border-b border-white/10">
                                                <div className="px-4 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Explore</div>
                                                <button onClick={() => { setView(AppView.COMMUNITY); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:text-cyan-400 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-start gap-3">
                                                    <Users className="w-3 h-3" /> Community
                                                </button>
                                                <button onClick={() => { setView(AppView.MARKETPLACE); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:text-cyan-400 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-start gap-3">
                                                    <ShoppingBag className="w-3 h-3" /> Marketplace
                                                </button>
                                            </div>

                                            <div className="py-2 border-b border-white/10">
                                                <div className="px-4 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Personal</div>
                                                <button onClick={() => { setView(AppView.REWARDS); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:text-cyan-400 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-start gap-3">
                                                    <Award className="w-3 h-3" /> Rewards
                                                </button>
                                                <button onClick={() => { setView(AppView.ACHIEVEMENTS); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:text-cyan-400 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-start gap-3">
                                                    <Medal className="w-3 h-3" /> Achievements
                                                </button>
                                                <button onClick={() => { setView(AppView.WALLET); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:text-cyan-400 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-start gap-3">
                                                    <CreditCard className="w-3 h-3" /> Wallet
                                                </button>
                                            </div>

                                            <div className="py-2 border-b border-white/10">
                                                <div className="px-4 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System</div>
                                                <button onClick={() => { setView(AppView.SUSTAINABILITY); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:text-cyan-400 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-start gap-3">
                                                    <Leaf className="w-3 h-3" /> Sustainability
                                                </button>

                                                <button onClick={() => { setView(AppView.REFERRAL); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:text-cyan-400 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-start gap-3">
                                                    <Share2 className="w-3 h-3" /> Referrals
                                                </button>
                                            </div>

                                            <button onClick={() => { setView(AppView.SUPPORT); setUserMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-white hover:text-black text-xs font-bold text-white uppercase tracking-wider transition-colors flex items-center justify-start gap-3">
                                                <HelpCircle className="w-3 h-3" /> Support
                                            </button>
                                            <button onClick={() => {
                                                localStorage.removeItem('voyageur_dashboard_active_tab');
                                                setIsLoggedIn(false);
                                                setView(AppView.LANDING);
                                                setUserMenuOpen(false);
                                            }} className="w-full text-left px-4 py-3 hover:bg-white hover:text-black text-xs font-bold text-white uppercase tracking-wider transition-colors flex items-center justify-start gap-3">
                                                <LogOut className="w-3 h-3" /> Sign Out
                                            </button>

                                        </div >
                                    </div >
                                </div >
                            )}
                        </div >
                    </div >

                    <div className={`w-full flex flex-col z-10 px-0 pb-0 md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.725,0,1)] overflow-y-auto max-h-[85vh] ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                        <div className="flex flex-col p-4 gap-2">
                            {navItems.map((item, idx) => (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        setView(item.view);
                                        setMobileMenuOpen(false);
                                    }}
                                    style={{ transitionDelay: `${idx * 50}ms` }}
                                    className={`w-full text-left py-4 px-6 rounded-lg flex items-center justify-between text-lg font-bold uppercase tracking-widest pointer-events-auto transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${currentView === item.view
                                        ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                        : 'text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                                        }`}
                                >
                                    <span className="flex items-center gap-4">
                                        {item.icon} {item.label}
                                    </span>
                                    <ChevronRight className={`w-5 h-5 ${currentView === item.view ? 'text-black' : 'text-zinc-700'}`} />
                                </button>
                            ))}

                            <div className="h-px bg-white/10 my-4" />

                            {isLoggedIn ? (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'Community', view: AppView.COMMUNITY, icon: Users },
                                            { label: 'Marketplace', view: AppView.MARKETPLACE, icon: ShoppingBag },
                                            { label: 'Rewards', view: AppView.REWARDS, icon: Award },
                                            { label: 'Achievements', view: AppView.ACHIEVEMENTS, icon: Medal },
                                            { label: 'Wallet', view: AppView.WALLET, icon: CreditCard },
                                            { label: 'Sustainability', view: AppView.SUSTAINABILITY, icon: Leaf },

                                            { label: 'Support', view: AppView.SUPPORT, icon: HelpCircle },
                                        ].map((item, idx) => (
                                            <button
                                                key={item.label}
                                                onClick={() => { setView(item.view); setMobileMenuOpen(false); }}
                                                style={{ transitionDelay: `${(idx + 3) * 50}ms` }}
                                                className={`text-left py-3 px-4 rounded-lg border border-white/5 hover:border-white/20 flex flex-col gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white pointer-events-auto transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} hover:bg-white/5 bg-black/50`}
                                            >
                                                <item.icon className="w-5 h-5 text-zinc-500 mb-1" />
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="h-px bg-white/10 my-4" />

                                    <button
                                        onClick={() => {
                                            localStorage.removeItem('voyageur_dashboard_active_tab');
                                            setIsLoggedIn(false);
                                            setView(AppView.LANDING);
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full border border-white/20 text-white py-4 rounded-lg font-bold uppercase tracking-widest text-xs pointer-events-auto hover:bg-white hover:text-black transition-colors"
                                    >
                                        Sign Out
                                    </button>

                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setView(AppView.AUTH);
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full bg-white text-black py-4 rounded-lg font-bold uppercase tracking-widest text-sm pointer-events-auto hover:bg-cyan-400 transition-colors shadow-lg shadow-white/10"
                                >
                                    Sign In / Register
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav >


        </>
    );
};

export default Navigation;
