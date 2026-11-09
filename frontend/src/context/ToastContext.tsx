import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  duration?: number; // ms, default: 4000
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  count?: number;
  updatedAt?: number;
  isExiting?: boolean;
}

export interface ToastContextValue {
  toast: {
    success: (message: string, titleOrOptions?: string | ToastOptions) => string;
    error: (message: string, titleOrOptions?: string | ToastOptions) => string;
    warning: (message: string, titleOrOptions?: string | ToastOptions) => string;
    info: (message: string, titleOrOptions?: string | ToastOptions) => string;
    dismiss: (id: string) => void;
    clearAll: () => void;
  };
}

export const getToastDedupeKey = (type: ToastType, message: string, title?: string): string => {
  return `${type}:${(title || '').trim()}::${message.trim()}`;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Individual Toast Card Component
const ToastCard: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(item.duration);
  const lastTickRef = useRef(Date.now());

  // Reset progress and timer whenever duplicate trigger refreshes the toast
  useEffect(() => {
    remainingTimeRef.current = item.duration;
    setProgress(100);
    lastTickRef.current = Date.now();
  }, [item.updatedAt, item.duration]);

  useEffect(() => {
    if (item.duration <= 0) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - delta);
        setProgress((remainingTimeRef.current / item.duration) * 100);

        if (remainingTimeRef.current <= 0) {
          clearInterval(interval);
          onDismiss(item.id);
        }
      }
      lastTickRef.current = Date.now();
    }, 25);

    return () => clearInterval(interval);
  }, [isPaused, item.duration, item.id, onDismiss]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    lastTickRef.current = Date.now();
    setIsPaused(false);
  };

  const config = {
    success: {
      icon: <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.2} />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20',
      progressBar: 'bg-emerald-500 dark:bg-emerald-400',
    },
    error: {
      icon: <AlertCircle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" strokeWidth={2.2} />,
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20',
      progressBar: 'bg-rose-500 dark:bg-rose-400',
    },
    warning: {
      icon: <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2.2} />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20',
      progressBar: 'bg-amber-500 dark:bg-amber-400',
    },
    info: {
      icon: <Info size={15} className="text-blue-600 dark:text-blue-400 shrink-0" strokeWidth={2.2} />,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20',
      progressBar: 'bg-blue-500 dark:bg-blue-400',
    },
  }[item.type];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative w-full max-w-[360px] bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-900/5 dark:shadow-black/40 overflow-hidden select-none transition-all duration-200 ${
        item.isExiting ? 'toast-exit' : 'toast-enter'
      }`}
    >
      <div className="p-3 sm:py-3 sm:px-3.5 flex items-start gap-2.5">
        {/* Crisp Minimal Icon Pill */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${config.iconBg} mt-0.5`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          {item.title ? (
            <>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {item.title}
                </h4>
                {item.count && item.count > 1 && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 select-none">
                    ×{item.count}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 break-words font-normal">
                {item.message}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug break-words">
                {item.message}
              </p>
              {item.count && item.count > 1 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 select-none shrink-0">
                  ×{item.count}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => onDismiss(item.id)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 -mr-1 -mt-0.5"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Hairline Countdown Progress Bar */}
      {item.duration > 0 && (
        <div className="h-[2px] w-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
          <div
            className={`h-full ${config.progressBar} transition-all ease-linear opacity-80`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Synchronous deduplication map: dedupeKey -> toastId
  const activeKeysRef = useRef<Map<string, string>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const item = prev.find((t) => t.id === id);
      if (item) {
        const key = getToastDedupeKey(item.type, item.message, item.title);
        activeKeysRef.current.delete(key);
      }
      return prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t));
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const clearAll = useCallback(() => {
    activeKeysRef.current.clear();
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, titleOrOptions?: string | ToastOptions): string => {
      let title: string | undefined;
      let duration = 3800;

      if (typeof titleOrOptions === 'string') {
        title = titleOrOptions;
      } else if (titleOrOptions) {
        title = titleOrOptions.title;
        if (titleOrOptions.duration !== undefined) {
          duration = titleOrOptions.duration;
        }
      }

      const dedupeKey = getToastDedupeKey(type, message, title);
      const existingId = activeKeysRef.current.get(dedupeKey);

      // Duplicate prevention: If a toast with identical type, title, and message is active, refresh it instead of creating a duplicate
      if (existingId) {
        setToasts((prev) =>
          prev.map((t) => {
            if (t.id === existingId) {
              return {
                ...t,
                count: (t.count || 1) + 1,
                updatedAt: Date.now(),
                isExiting: false,
              };
            }
            return t;
          })
        );
        return existingId;
      }

      // Generate unique ID for fresh toast
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      activeKeysRef.current.set(dedupeKey, id);

      const newToast: ToastItem = {
        id,
        type,
        message,
        title,
        duration,
        count: 1,
        updatedAt: Date.now(),
      };

      setToasts((prev) => {
        // Extra safeguard: verify no active duplicates exist in state
        const duplicate = prev.find(
          (t) => !t.isExiting && getToastDedupeKey(t.type, t.message, t.title) === dedupeKey
        );
        if (duplicate) {
          return prev.map((t) =>
            t.id === duplicate.id
              ? { ...t, count: (t.count || 1) + 1, updatedAt: Date.now(), isExiting: false }
              : t
          );
        }

        // Clean up keys of any items being pushed out of max stack limit
        if (prev.length >= 4) {
          const evicted = prev.slice(0, prev.length - 3);
          for (const item of evicted) {
            activeKeysRef.current.delete(getToastDedupeKey(item.type, item.message, item.title));
          }
        }

        return [...prev.slice(-3), newToast]; // Keep up to 4 concurrent toasts
      });

      return id;
    },
    []
  );

  const toastMethods = {
    success: (message: string, titleOrOptions?: string | ToastOptions) =>
      addToast('success', message, titleOrOptions),
    error: (message: string, titleOrOptions?: string | ToastOptions) =>
      addToast('error', message, titleOrOptions),
    warning: (message: string, titleOrOptions?: string | ToastOptions) =>
      addToast('warning', message, titleOrOptions),
    info: (message: string, titleOrOptions?: string | ToastOptions) =>
      addToast('info', message, titleOrOptions),
    dismiss,
    clearAll,
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      {/* Toast Portal Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] pointer-events-none flex flex-col items-end gap-2 max-w-sm w-full"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
