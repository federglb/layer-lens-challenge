'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconMap: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

const styleMap: Record<ToastType, string> = {
  success: 'bg-secondary-fixed text-on-secondary-fixed',
  error: 'bg-tertiary-container text-white',
  info: 'bg-primary text-on-primary',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-fade-in-up flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl pointer-events-auto min-w-[300px] ${styleMap[toast.type]}`}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">
              {iconMap[toast.type]}
            </span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold leading-none">{toast.title}</span>
              {toast.message && (
                <span className="text-[11px] mt-1 opacity-90 font-medium truncate">
                  {toast.message}
                </span>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 hover:bg-black/10 rounded-full transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
