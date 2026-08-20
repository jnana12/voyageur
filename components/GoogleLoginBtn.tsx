
import React, { useState } from 'react';
import { AppView } from '../types';
import { Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

interface GoogleLoginBtnProps {
    onSuccess: (user: any) => void;
    onError: (error: string) => void;
    setView: (view: AppView) => void;
    isSignup?: boolean;
}

const GoogleLoginBtn: React.FC<GoogleLoginBtnProps> = ({ onSuccess, onError, setView, isSignup = false }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            // Use Supabase OAuth redirect - this is the most reliable method
            // No backend call needed - goes directly to Google then back to app
            await authService.loginWithGoogle(isSignup);
            // Note: This will redirect to Google, then back to the app
            // The session will be picked up by App.tsx on redirect
        } catch (err: any) {
            console.error("Google Auth Error:", err);
            onError(err.message || "Google login failed");
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full relative">
            {isLoading && (
                <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center rounded">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                </div>
            )}

            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-zinc-100 text-black font-medium transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
                Continue with Google
            </button>
        </div>
    );
};

export default GoogleLoginBtn;
