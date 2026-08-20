
import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppView } from '../types';
import { authService } from '../services/authService';
import { checkPasswordCompromised } from '../utils/security';
import { getPasswordStrength, MIN_PASSWORD_STRENGTH } from '../utils/passwordValidation';

interface UpdatePasswordProps {
    setView: (view: AppView) => void;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({ setView }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    };

    const passwordStrength = getPasswordStrength(formData.password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (formData.password !== formData.confirmPassword) {
                throw new Error("Passwords do not match.");
            }
            if (passwordStrength < MIN_PASSWORD_STRENGTH) {
                throw new Error("Password is too weak.");
            }

            // Check for compromised password
            const isCompromised = await checkPasswordCompromised(formData.password);
            if (isCompromised) {
                throw new Error("This password has been exposed in a data breach. Please choose a different password.");
            }

            const result = await authService.updatePassword(formData.password);

            if (result.success) {
                setSuccess("Password updated successfully! Redirecting to Sign In...");
                setTimeout(() => {
                    setView(AppView.AUTH);
                }, 2000);
            } else {
                throw new Error(result.message || "Failed to update password.");
            }
        } catch (err: any) {
            console.error("Update Password Error:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-20 md:pt-24 pb-12 px-4 md:px-6 relative overflow-hidden bg-black">
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <div className="bg-black border border-white/20 p-6 md:p-8 shadow-2xl relative">

                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight uppercase">
                            New Password
                        </h2>
                        <p className="text-zinc-500 font-mono text-sm">
                            Create a new secure password for your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {error && (
                            <div className="flex flex-col gap-2 items-center text-center mb-4 animate-fade-in-up">
                                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span className="font-bold text-xs uppercase tracking-widest">{error}</span>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-900/10 border border-emerald-900/50 p-4 flex items-center gap-2 text-sm text-emerald-400 font-mono">
                                <CheckCircle2 className="w-4 h-4" /> {success}
                            </div>
                        )}

                        <div className="space-y-2 animate-fade-in-up">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">New Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-black border border-white/20 px-12 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-all font-mono text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            {/* Password Strength Indicator */}
                            {formData.password && (
                                <div className="flex gap-1 mt-1 h-1">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={`flex-1 transition-colors duration-300 ${passwordStrength >= level
                                                ? (passwordStrength <= 2 ? 'bg-red-500' : passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-emerald-500')
                                                : 'bg-zinc-800'
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 animate-fade-in-up">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-black border border-white/20 px-12 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-all font-mono text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !!success}
                            className="w-full bg-cyan-400 text-black font-bold py-5 hover:bg-white hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all flex items-center justify-center gap-2 mt-6 uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                <>
                                    Update Password <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setView(AppView.AUTH)}
                            className="w-full text-zinc-500 text-xs uppercase tracking-widest hover:text-white transition-all mt-4"
                        >
                            Back to Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UpdatePassword;
