import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 4000 }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            // Allow exit animation to finish before unmounting
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const handleManualClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
        error: <XCircle className="w-5 h-5 text-red-400" />,
        info: <Info className="w-5 h-5 text-cyan-400" />
    };

    const styles = {
        success: 'border-emerald-500/20 bg-emerald-950/80 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
        error: 'border-red-500/20 bg-red-950/80 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
        info: 'border-cyan-500/20 bg-cyan-950/80 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
    };

    return (
        <div
            className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[3000] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'} ${styles[type]}`}
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <p className="text-sm font-medium text-white pr-2">
                {message}
            </p>
            <button
                onClick={handleManualClose}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close"
            >
                <X className="w-4 h-4 text-zinc-400 hover:text-white" />
            </button>
        </div>
    );
};
