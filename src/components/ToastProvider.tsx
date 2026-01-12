import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: string; message: string; type?: 'info' | 'success' | 'error' };

const ToastContext = createContext<{ push: (t: Omit<Toast, 'id'>) => void } | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const push = useCallback((t: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts((s) => [...s, { id, ...t }]);
        // auto-remove after 4s
        setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4000);
    }, []);

    const value = useMemo(() => ({ push }), [push]);

    // expose a minimal global helper for parts of the app that don't import the hook
    (window as any).__USE_TOAST__ = value;

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999 }}>
                {toasts.map((t) => (
                    <div key={t.id} style={{
                        marginTop: 8,
                        padding: '10px 14px',
                        borderRadius: 8,
                        color: '#fff',
                        background: t.type === 'error' ? '#e53e3e' : t.type === 'success' ? '#16a34a' : '#334155',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
                    }}>{t.message}</div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
