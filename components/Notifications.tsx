
import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Globe, Shield, Activity, Moon, Sun } from 'lucide-react';

const Notifications: React.FC = () => {
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [pushEnabled, setPushEnabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(false);

    const [categories, setCategories] = useState([
        { id: 'trips', label: 'Trip Updates', desc: 'Flight changes, itinerary updates, and reminders.', enabled: true, icon: Globe },
        { id: 'security', label: 'Security & login', desc: 'New device logins and password resets.', enabled: true, icon: Shield },
        { id: 'marketing', label: 'Marketing & Offers', desc: 'Exclusive deals and partner promotions.', enabled: false, icon: Bell },
        { id: 'activity', label: 'Account Activity', desc: 'Weekly summary of your travel stats.', enabled: true, icon: Activity },
    ]);

    const toggleCategory = (id: string) => {
        setCategories(categories.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    };

    return (
        <div className="min-h-screen pt-32 pb-20 px-6 max-w-3xl mx-auto">
            <div className="mb-12 border-b border-white/10 pb-8">
                <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-tighter">Notifications</h2>
                <p className="text-zinc-500 font-mono">Control how and when we communicate with you.</p>
            </div>

            {/* Channels */}
            <div className="mb-12">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 px-1">Communication Channels</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-black/50 border border-white/10 p-6 rounded-xl hover:border-white/20 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center rounded-lg border border-white/5">
                                <Mail className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-white">Email Notifications</h4>
                                <p className="text-xs text-zinc-500 font-mono">sent to jnana...ug@example.com</p>
                            </div>
                        </div>
                        {/* Toggle Switch */}
                        <button
                            onClick={() => setEmailEnabled(!emailEnabled)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 relative ${emailEnabled ? 'bg-cyan-500' : 'bg-zinc-800'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${emailEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between bg-black/50 border border-white/10 p-6 rounded-xl hover:border-white/20 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center rounded-lg border border-white/5">
                                <Smartphone className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-white">Push Notifications</h4>
                                <p className="text-xs text-zinc-500 font-mono">Mobile app alerts</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setPushEnabled(!pushEnabled)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 relative ${pushEnabled ? 'bg-cyan-500' : 'bg-zinc-800'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${pushEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between bg-black/50 border border-white/10 p-6 rounded-xl hover:border-white/20 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center rounded-lg border border-white/5">
                                <span className="font-bold text-zinc-500 text-xs">SMS</span>
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-white">SMS Messages</h4>
                                <p className="text-xs text-zinc-500 font-mono">Urgent travel updates only</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSmsEnabled(!smsEnabled)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 relative ${smsEnabled ? 'bg-cyan-500' : 'bg-zinc-800'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${smsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* granular settings */}
            <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 px-1">Notification Types</h3>
                <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                    {categories.map((cat) => (
                        <div key={cat.id} className="p-6 flex items-start justify-between hover:bg-white/5 transition-colors">
                            <div className="flex gap-4">
                                <cat.icon className="w-5 h-5 text-zinc-500 mt-1" />
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-1">{cat.label}</h4>
                                    <p className="text-xs text-zinc-400 leading-relaxed max-w-[300px]">{cat.desc}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleCategory(cat.id)}
                                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 relative ${cat.enabled ? 'bg-zinc-600' : 'bg-zinc-800'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${cat.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-12 p-6 border border-white/10 rounded-xl bg-gradient-to-r from-blue-900/10 to-purple-900/10 flex items-center justify-between">
                <div>
                    <h4 className="text-base font-bold text-white mb-1">Quiet Mode</h4>
                    <p className="text-xs text-zinc-400">Pause all notifications during 10 PM - 7 AM</p>
                </div>
                <button className="px-4 py-2 bg-transparent border border-white/20 text-white text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
                    Configure
                </button>
            </div>

        </div>
    );
};

export default Notifications;
