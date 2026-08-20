import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    type?: 'default' | 'warning' | 'success' | 'error' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    showCloseButton?: boolean;
    isLoading?: boolean;
}

const typeConfig = {
    default: {
        icon: null,
        iconBg: 'bg-white/10',
        iconColor: 'text-white',
        confirmBg: 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]',
    },
    warning: {
        icon: AlertTriangle,
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-400',
        confirmBg: 'bg-orange-500 hover:bg-orange-400 text-black hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]',
    },
    success: {
        icon: CheckCircle,
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        confirmBg: 'bg-emerald-500 hover:bg-emerald-400 text-black hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
    },
    error: {
        icon: XCircle,
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        confirmBg: 'bg-red-500 hover:bg-red-400 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
    },
    info: {
        icon: Info,
        iconBg: 'bg-cyan-500/20',
        iconColor: 'text-cyan-400',
        confirmBg: 'bg-cyan-500 hover:bg-cyan-400 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]',
    },
};

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    type = 'default',
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    showCloseButton = true,
    isLoading = false,
}) => {
    if (!isOpen) return null;

    const config = typeConfig[type];
    const IconComponent = config.icon;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 shadow-2xl animate-fade-in-up overflow-hidden">
                {/* Header */}
                <div className="flex items-start gap-4 p-6 pb-4 border-b border-white/5">
                    {IconComponent && (
                        <div className={`p-3 ${config.iconBg} flex-shrink-0`}>
                            <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                            {title}
                        </h3>
                    </div>
                    {showCloseButton && !isLoading && (
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 text-zinc-300 text-sm leading-relaxed">
                    {children}
                </div>

                {/* Footer */}
                {(confirmText || cancelText) && (
                    <div className="flex gap-3 p-6 pt-0">
                        {cancelText && (
                            <button
                                onClick={onCancel || onClose}
                                disabled={isLoading}
                                className="flex-1 px-6 py-3 font-bold text-sm uppercase tracking-wider border border-white/20 text-zinc-400 hover:text-white hover:border-white transition-all disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                        )}
                        {confirmText && (
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`flex-1 px-6 py-3 font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 ${config.confirmBg}`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : confirmText}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ===== TOAST NOTIFICATIONS =====

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const toastIcons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const toastStyles = {
    success: 'border-emerald-500/30 bg-emerald-500/10',
    error: 'border-red-500/30 bg-red-500/10',
    warning: 'border-orange-500/30 bg-orange-500/10',
    info: 'border-cyan-500/30 bg-cyan-500/10',
};

const toastIconStyles = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-orange-400',
    info: 'text-cyan-400',
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const Icon = toastIcons[toast.type];

    React.useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration || 4000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div
            className={`w-full flex items-center gap-3 px-4 py-3 border backdrop-blur-xl shadow-lg animate-fade-in-up rounded-lg ${toastStyles[toast.type]}`}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${toastIconStyles[toast.type]}`} />
            <p className="text-sm text-white flex-1">{toast.message}</p>
            <button
                onClick={() => onRemove(toast.id)}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const showToast = React.useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = React.useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container - Responsive positioning */}
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[10000] flex flex-col items-center md:items-end gap-2 md:max-w-sm">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default Modal;
