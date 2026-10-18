import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X, 
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  subtitle?: string;
  message: React.ReactNode | string;
  itemName?: string;
  itemType?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'primary';
  loading?: boolean;
  requireTextMatch?: string; // If provided, user must type this exact text to enable confirm button
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  message,
  itemName,
  itemType,
  confirmText,
  cancelText = 'Cancel',
  variant = 'danger',
  loading: externalLoading = false,
  requireTextMatch,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [typedMatch, setTypedMatch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loading = externalLoading || internalLoading;

  useEffect(() => {
    if (isOpen) {
      setTypedMatch('');
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isMatchValid = !requireTextMatch || typedMatch.trim() === requireTextMatch.trim();

  const handleConfirm = async () => {
    if (!isMatchValid || loading) return;

    setError(null);
    setInternalLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Operation failed. Please try again.';
      setError(msg);
    } finally {
      setInternalLoading(false);
    }
  };

  const variantConfig = {
    danger: {
      icon: <Trash2 size={22} className="text-rose-600 dark:text-rose-400" />,
      iconRing: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60 ring-4 ring-rose-500/10',
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900/60',
      confirmBtn: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-500/20 shadow-md',
      defaultConfirmText: 'Delete Permanently',
      cardBorder: 'border-rose-200/60 dark:border-rose-900/40',
      accentTop: 'from-rose-500 to-red-600',
    },
    warning: {
      icon: <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />,
      iconRing: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60 ring-4 ring-amber-500/10',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/60',
      confirmBtn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-500/20 shadow-md',
      defaultConfirmText: 'Confirm Action',
      cardBorder: 'border-amber-200/60 dark:border-amber-900/40',
      accentTop: 'from-amber-500 to-orange-600',
    },
    info: {
      icon: <Info size={22} className="text-blue-600 dark:text-blue-400" />,
      iconRing: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/60 ring-4 ring-blue-500/10',
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900/60',
      confirmBtn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 shadow-md',
      defaultConfirmText: 'Proceed',
      cardBorder: 'border-blue-200/60 dark:border-blue-900/40',
      accentTop: 'from-blue-500 to-indigo-600',
    },
    primary: {
      icon: <CheckCircle2 size={22} className="text-indigo-600 dark:text-indigo-400" />,
      iconRing: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900/60 ring-4 ring-indigo-500/10',
      badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
      confirmBtn: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/20 shadow-md',
      defaultConfirmText: 'Confirm',
      cardBorder: 'border-indigo-200/60 dark:border-indigo-900/40',
      accentTop: 'from-indigo-500 to-blue-600',
    },
  }[variant];

  return (
    <div 
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md modal-backdrop-animate"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden modal-content-animate flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${variantConfig.accentTop}`} />

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl border ${variantConfig.iconRing} shrink-0`}>
                {variantConfig.icon}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Error Message if any */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Highlight Box */}
          {itemName && (
            <div className={`p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border ${variantConfig.cardBorder} flex items-center justify-between gap-3`}>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {itemType || 'Target Item'}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono truncate">
                  {itemName}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${variantConfig.badge}`}>
                {variant === 'danger' ? 'Irreversible' : 'Action Required'}
              </span>
            </div>
          )}

          {/* Descriptive Message */}
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          {/* Consequence Alert Pill */}
          {variant === 'danger' && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
              <ShieldAlert size={15} className="shrink-0 text-rose-500" />
              <span>This record and its immediate allocations will be removed from the system.</span>
            </div>
          )}

          {/* Type match to confirm if required */}
          {requireTextMatch && (
            <div className="pt-2 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                To confirm, type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{requireTextMatch}</span> below:
              </label>
              <input
                type="text"
                value={typedMatch}
                onChange={(e) => setTypedMatch(e.target.value)}
                placeholder={requireTextMatch}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !isMatchValid}
              className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantConfig.confirmBtn}`}
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{confirmText || variantConfig.defaultConfirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
