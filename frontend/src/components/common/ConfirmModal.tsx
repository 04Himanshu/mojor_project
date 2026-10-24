import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Handle ESC key press and scroll locking
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
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
      icon: <Trash2 size={20} className="text-rose-500" />,
      iconRing: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
      badge: 'badge-danger',
      confirmBtn: 'btn-danger',
      defaultConfirmText: 'Delete Permanently',
      cardBorder: 'border-rose-500/20',
      accentTop: 'from-rose-500 to-red-600',
    },
    warning: {
      icon: <AlertTriangle size={20} className="text-amber-500" />,
      iconRing: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
      badge: 'badge-warning',
      confirmBtn: 'btn-primary bg-amber-600 hover:bg-amber-700',
      defaultConfirmText: 'Confirm Action',
      cardBorder: 'border-amber-500/20',
      accentTop: 'from-amber-500 to-orange-600',
    },
    info: {
      icon: <Info size={20} className="text-blue-500" />,
      iconRing: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
      badge: 'badge-info',
      confirmBtn: 'btn-primary',
      defaultConfirmText: 'Proceed',
      cardBorder: 'border-blue-500/20',
      accentTop: 'from-blue-500 to-indigo-600',
    },
    primary: {
      icon: <CheckCircle2 size={20} className="text-blue-500" />,
      iconRing: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
      badge: 'badge-info',
      confirmBtn: 'btn-primary',
      defaultConfirmText: 'Confirm',
      cardBorder: 'border-blue-500/20',
      accentTop: 'from-blue-600 to-indigo-600',
    },
  }[variant];

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden modal-content-animate flex flex-col relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${variantConfig.accentTop}`} />

        <div className="p-6 space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${variantConfig.iconRing} shrink-0`}>
                {variantConfig.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="btn-ghost p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Error Message if any */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Highlight Box */}
          {itemName && (
            <div className={`p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border ${variantConfig.cardBorder} flex items-center justify-between gap-3`}>
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
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          {/* Consequence Alert Pill */}
          {variant === 'danger' && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 font-medium">
              <ShieldAlert size={15} className="shrink-0 text-rose-500" />
              <span>This record and its immediate allocations will be permanently removed.</span>
            </div>
          )}

          {/* Type match to confirm if required */}
          {requireTextMatch && (
            <div className="pt-2 space-y-1.5">
              <label className="form-label">
                To confirm, type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{requireTextMatch}</span> below:
              </label>
              <input
                type="text"
                value={typedMatch}
                onChange={(e) => setTypedMatch(e.target.value)}
                placeholder={requireTextMatch}
                className="input-base font-mono"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary text-xs"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !isMatchValid}
              className={`${variantConfig.confirmBtn} text-xs py-2 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{confirmText || variantConfig.defaultConfirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
