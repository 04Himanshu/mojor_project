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
  isExiting?: boolean;
}

interface ToastContextValue {
  toast: {
    success: (message: string, titleOrOptions?: string | ToastOptions) => string;
    error: (message: string, titleOrOptions?: string | ToastOptions) => string;
    warning: (message: string, titleOrOptions?: string | ToastOptions) => string;
    info: (message: string, titleOrOptions?: string | ToastOptions) => string;
    dismiss: (id: string) => void;
    clearAll: () => void;
  };
}

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
      icon: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
      defaultTitle: 'Success',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/60',
      progressBar: 'bg-emerald-500',
      accentGlow: 'shadow-emerald-500/10 dark:shadow-emerald-950/30',
      titleColor: 'text-emerald-950 dark:text-emerald-200',
    },
    error: {
      icon: <AlertCircle size={18} className="text-rose-500 shrink-0" />,
      defaultTitle: 'Error',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/80 dark:border-rose-800/60',
      progressBar: 'bg-rose-500',
      accentGlow: 'shadow-rose-500/10 dark:shadow-rose-950/30',
      titleColor: 'text-rose-950 dark:text-rose-200',
    },
    warning: {
      icon: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
      defaultTitle: 'Attention',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/60',
      progressBar: 'bg-amber-500',
      accentGlow: 'shadow-amber-500/10 dark:shadow-amber-950/30',
      titleColor: 'text-amber-950 dark:text-amber-200',
    },
    info: {
      icon: <Info size={18} className="text-blue-500 shrink-0" />,
      defaultTitle: 'Information',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800/60',
      progressBar: 'bg-blue-500',
      accentGlow: 'shadow-blue-500/10 dark:shadow-blue-950/30',
      titleColor: 'text-blue-950 dark:text-blue-200',
    },
  }[item.type];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl ${config.accentGlow} overflow-hidden select-none transition-all duration-200 ${
        item.isExiting ? 'toast-exit' : 'toast-enter'
      }`}
    >
      <div className="p-3.5 sm:p-4 flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-xl border ${config.iconBg} shrink-0 mt-0.5 shadow-2xs`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className={`text-xs font-bold leading-tight ${config.titleColor}`}>
            {item.title || config.defaultTitle}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-0.5 break-words">
            {item.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => onDismiss(item.id)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 -mr-1"
          title="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      {item.duration > 0 && (
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
          <div
            className={`h-full ${config.progressBar} transition-all ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, titleOrOptions?: string | ToastOptions): string => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let title: string | undefined;
      let duration = 4200;

      if (typeof titleOrOptions === 'string') {
        title = titleOrOptions;
      } else if (titleOrOptions) {
        title = titleOrOptions.title;
        if (titleOrOptions.duration !== undefined) {
          duration = titleOrOptions.duration;
        }
      }

      const newToast: ToastItem = {
        id,
        type,
        message,
        title,
        duration,
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 concurrent toasts
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
        className="fixed top-5 right-5 z-[9999] pointer-events-none flex flex-col items-end gap-2.5 max-w-sm sm:max-w-md w-full"
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
