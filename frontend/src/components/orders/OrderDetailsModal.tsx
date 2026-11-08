import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Order } from '../../types/order';
import { orderApi } from '../../services/orderApi';
import { ConfirmModal } from '../common/ConfirmModal';
import { useRBAC, PERMISSIONS } from '../../utils/rbac';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  PackageCheck,
  Store,
  User,
  CreditCard,
  Ban
} from 'lucide-react';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: () => void;
  onOpenInvoice: (order: Order) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

export const OrderDetailsModal: React.FC<Props> = ({
  order,
  isOpen,
  onClose,
  onStatusUpdated,
  onOpenInvoice,
  showNotification
}) => {
  const { isAdmin: isUserAdmin, hasPermission: checkPerm } = useRBAC();
  const canChangeStatus = isUserAdmin || checkPerm(PERMISSIONS.ORDERS_STATUS_CHANGE);
  const canViewInvoice = isUserAdmin || checkPerm(PERMISSIONS.ORDERS_INVOICE);

  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Lock background scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCancelConfirmOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isCancelConfirmOpen]);

  if (!isOpen || !order) return null;

  const isCancelled = order.status === 'Cancelled';

  const handleVoidOrder = async () => {
    setUpdating(true);
    setError(null);
    try {
      await orderApi.updateOrderStatus(order.id, {
        status: 'Cancelled',
        payment_status: 'Refunded',
        notes: 'Counter sale voided/cancelled'
      });
      showNotification(`Order ${order.order_number} voided. Stock successfully restored to inventory!`);
      onStatusUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to cancel order';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setUpdating(false);
      setIsCancelConfirmOpen(false);
    }
  };

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col modal-content-animate my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              {order.order_number}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Walk-in Order Overview</span>
                <span className={`text-[10px] py-0.5 px-2 rounded-full font-semibold ${
                  isCancelled 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}>
                  {order.status}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Processed {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenInvoice(order)}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} className="text-blue-500" />
              <span>Sales Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="btn-ghost p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Order Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
              isCancelled
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <XCircle size={17} className="text-rose-500 shrink-0" />
              ) : (
                <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
              )}
              <span>
                {isCancelled
                  ? 'Counter Sale Cancelled / Voided. All inventory items have been released and restored to available stock.'
                  : 'Walk-in Sale Completed. The customer purchased items at the counter, and stock was deducted from inventory.'}
              </span>
            </div>
            {!isCancelled && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                <PackageCheck size={13} />
                Stock Deducted
              </span>
            )}
          </div>

          {/* Customer, Staff & Payment Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="card-base p-3.5 space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-blue-500" />
                Customer
              </span>
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {order.customer_name}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {order.customer_phone || 'Walk-in Customer'}
              </div>
            </div>

            <div className="card-base p-3.5 space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Store size={13} className="text-purple-500" />
                Served By (Staff)
              </span>
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {order.user_name}
              </div>
              <div className="text-xs text-slate-500">
                In-Store Counter Handover
              </div>
            </div>

            <div className="card-base p-3.5 space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={13} className="text-emerald-500" />
                Payment Method
              </span>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {order.payment_method}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {order.payment_status}
              </div>
            </div>
          </div>

          {/* Purchased Line Items */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Purchased Items ({order.items.length})
            </span>
            <div className="table-container">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="table-th">Product Item & SKU</th>
                    <th className="table-th text-center">Qty Purchased</th>
                    <th className="table-th text-right">Unit Price</th>
                    <th className="table-th text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {order.items.map((item) => (
                    <tr key={item.id} className="table-row-hover">
                      <td className="table-td">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.item_name || 'Product'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.item_sku || 'N/A'}
                        </div>
                      </td>
                      <td className="table-td text-center font-semibold font-mono">
                        {item.quantity} {item.unit_of_measurement || 'pcs'}
                      </td>
                      <td className="table-td text-right text-slate-500 font-mono">
                        ₹{item.price_at_time.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-td text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                        ₹{item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Calculation Breakdown */}
              <div className="bg-slate-50/60 dark:bg-slate-900/60 p-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">
                    ₹{order.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>GST ({(order.tax_rate * 100).toFixed(0)}%):</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">
                      +₹{order.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Discount:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                      -₹{order.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-semibold text-slate-900 dark:text-white">
                  <span>Total Amount Paid:</span>
                  <span className="text-blue-600 dark:text-blue-400 text-base font-mono font-bold">
                    ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Void / Cancel Sale Action */}
          {!isCancelled && canChangeStatus && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                  Void or Refund Counter Sale
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cancelling will immediately return all {order.items.length} items back into store inventory.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(true)}
                disabled={updating}
                className="btn-danger text-xs py-2 px-3 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Ban size={14} />
                <span>Void Sale & Restore Stock</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <span className="text-xs text-slate-400">
            Order Ref: <strong className="font-mono text-slate-700 dark:text-slate-300">{order.order_number}</strong>
          </span>
          <div className="flex items-center gap-2">
            {canViewInvoice && (
              <button
                type="button"
                onClick={() => onOpenInvoice(order)}
                className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileText size={13} className="text-blue-500" />
                <span>View Receipt</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-primary text-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleVoidOrder}
        title="Void Counter Sale"
        subtitle="Automatic inventory stock restoration"
        message={`Are you sure you want to void Order ${order.order_number}? All ${order.items.length} items purchased by the customer will automatically be added back to store inventory.`}
        itemName={`Order ${order.order_number} • ₹${order.total_amount.toLocaleString('en-IN')}`}
        itemType="COUNTER SALE"
        confirmText="Yes, Void Sale"
        variant="danger"
      />
    </div>,
    document.body
  );
};
