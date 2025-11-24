import React, { useEffect } from 'react';

/**
 * Modal Component - Reusable modal with backdrop and animations
 * Used for notifications, confirmations, and game events
 */
const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    message, 
    icon = '⚠️',
    type = 'info', // 'info', 'warning', 'error', 'success'
    showCloseButton = true,
    children 
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const typeStyles = {
        info: {
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            borderColor: 'border-blue-500/30'
        },
        warning: {
            iconBg: 'bg-yellow-500/20',
            iconColor: 'text-yellow-400',
            borderColor: 'border-yellow-500/30'
        },
        error: {
            iconBg: 'bg-red-500/20',
            iconColor: 'text-red-400',
            borderColor: 'border-red-500/30'
        },
        success: {
            iconBg: 'bg-green-500/20',
            iconColor: 'text-green-400',
            borderColor: 'border-green-500/30'
        }
    };

    const styles = typeStyles[type] || typeStyles.info;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div 
                className={`
                    relative bg-slate-800 rounded-2xl border shadow-2xl
                    max-w-md w-full p-6 animate-scale-in
                    ${styles.borderColor}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                    <span className="text-3xl">{icon}</span>
                </div>

                {/* Title */}
                {title && (
                    <h3 className={`text-xl font-bold text-center mb-2 ${styles.iconColor}`}>
                        {title}
                    </h3>
                )}

                {/* Message */}
                {message && (
                    <p className="text-gray-300 text-center mb-6">
                        {message}
                    </p>
                )}

                {/* Custom Content */}
                {children}

                {/* Close Button */}
                {showCloseButton && (
                    <div className="flex justify-center">
                        <button
                            onClick={onClose}
                            className={`
                                px-6 py-2.5 rounded-lg font-semibold transition-all
                                bg-blue-600 hover:bg-blue-500 text-white
                                transform hover:scale-105 active:scale-95
                            `}
                        >
                            OK
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;

