import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    onCancel?: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    singleAction?: boolean; // For "Alert" style (no cancel)
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info',
    singleAction = false
}) => {
    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        onClose();
    };

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle className="w-6 h-6 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
            case 'success': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
            default: return <Info className="w-6 h-6 text-cyan-500" />;
        }
    };

    const getBorderClass = () => {
        switch (type) {
            case 'danger': return 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]';
            case 'warning': return 'border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.2)]';
            case 'success': return 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]';
            default: return 'border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)]';
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000] animate-fade-in" />
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                    <Dialog.Content className={`w-full max-w-md bg-zinc-950/90 backdrop-blur-xl border rounded-2xl p-6 animate-fade-in-up ${getBorderClass()}`}>

                        <div className="flex items-start gap-4 mb-6">
                            <div className={`p-3 rounded-full bg-white/5 border border-white/10 shrink-0`}>
                                {getIcon()}
                            </div>
                            <div className="flex-1">
                                <Dialog.Title className="text-lg font-bold text-white uppercase tracking-wider mb-2 font-mono">
                                    {title}
                                </Dialog.Title>
                                <Dialog.Description className="text-sm text-zinc-400 leading-relaxed">
                                    {message}
                                </Dialog.Description>
                            </div>
                        </div>

                        <div className="flex justify-center gap-3">
                            {!singleAction && (
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-bold uppercase tracking-wider"
                                >
                                    {cancelText}
                                </button>
                            )}
                            <button
                                onClick={handleConfirm}
                                className={`px-6 py-2 rounded-lg text-black font-bold uppercase tracking-wider text-xs transition-all hover:scale-105 active:scale-95 ${type === 'danger' ? 'bg-red-500 hover:bg-red-400' :
                                    type === 'warning' ? 'bg-amber-500 hover:bg-amber-400' :
                                        type === 'success' ? 'bg-emerald-500 hover:bg-emerald-400' :
                                            'bg-cyan-500 hover:bg-cyan-400'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>

                        <Dialog.Close asChild>
                            <button className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
