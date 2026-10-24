import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Order, OrderStatus } from '../../types/order';
import { orderApi } from '../../services/orderApi';
import { ConfirmModal } from '../common/ConfirmModal';
import { 
  X, 
  FileText, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  PackageCheck,
  PackageX,
  MapPin,
  ChevronRight,
} from 'lucide-react';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: () => void;
  onOpenInvoice: (order: Order) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const LIFECYCLE_STEPS: OrderStatus[] = ['Pending', 'Confirmed', 'Dispatched', 'Delivered'];

export const OrderDetailsModal: React.FC<Props> = ({
  order,
  isOpen,
  onClose,
  onStatusUpdated,
  onOpenInvoice,
  showNotification
}) => {
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('Pending');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  useEffect(() => {
    if (order) {
      setTargetStatus(order.status);
      setError(null);
    }
  }, [order, isOpen]);

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

  const currentStepIdx = LIFECYCLE_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'Cancelled';

  const executeStatusUpdate = async (statusToSet: OrderStatus) => {
    setUpdating(true);
    setError(null);
    try {
      await orderApi.updateOrderStatus(order.id, { status: statusToSet });
      showNotification(`Order ${order.order_number} status updated to ${statusToSet}!`);
      onStatusUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to update order status';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setUpdating(false);
      setIsCancelConfirmOpen(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (targetStatus === order.status) return;

    if (targetStatus === 'Cancelled' && order.stock_deducted) {
      setIsCancelConfirmOpen(true);
      return;
    }

    await executeStatusUpdate(targetStatus);
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
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Order Overview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Created {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenInvoice(order)}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <FileText size={14} className="text-blue-500" />
              Tax Invoice
            </button>
            <button
              onClick={onClose}
              className="btn-ghost p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
          {/* Order Lifecycle Progress Bar */}
          <div className="card-base p-4 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Fulfillment Lifecycle
              </span>
              <span className="text-xs font-medium text-slate-500">
                Current: <strong className="text-slate-900 dark:text-white">{order.status}</strong>
              </span>
            </div>

            {isCancelled ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
                <XCircle size={16} />
                Order was Cancelled. Any previously deducted inventory stock has been restored to warehouse counts.
              </div>
            ) : (
              <div className="flex items-center justify-between relative px-3 py-1">
                {/* Connecting Line */}
                <div className="absolute top-4 left-7 right-7 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
                <div
                  className="absolute top-4 left-7 h-0.5 bg-blue-600 dark:bg-blue-500 transition-all duration-300 -z-0"
                  style={{
                    width: `${Math.max(0, (currentStepIdx / (LIFECYCLE_STEPS.length - 1)) * 100)}%`
                  }}
                />

                {LIFECYCLE_STEPS.map((step, idx) => {
                  const isDone = currentStepIdx >= idx;
                  const isCurrent = currentStepIdx === idx;

                  return (
                    <div key={step} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isDone
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 size={15} /> : idx + 1}
                      </div>
                      <span
                        className={`text-[11px] font-medium mt-1.5 ${
                          isCurrent
                            ? 'text-blue-600 dark:text-blue-400 font-semibold'
                            : isDone
                            ? 'text-slate-700 dark:text-slate-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stock Allocation Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
              order.stock_deducted
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {order.stock_deducted ? (
                <PackageCheck size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <PackageX size={16} className="text-amber-500 shrink-0" />
              )}
              <span>
                {order.stock_deducted
                  ? 'Physical Stock Deducted: Units have been allocated and locked from the inventory system.'
                  : 'Pending Stock Allocation: Stock is held pending confirmation. Moving to Confirmed triggers automatic warehouse deduction.'}
              </span>
            </div>
          </div>

          {/* Customer & Shipping Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-base p-4 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-blue-500" />
                Customer Contact
              </span>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {order.customer_name}
              </div>
              {order.customer_email && (
                <div className="text-xs text-slate-500">{order.customer_email}</div>
              )}
              {order.customer_phone && (
                <div className="text-xs text-slate-500">{order.customer_phone}</div>
              )}
            </div>

            <div className="card-base p-4 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-emerald-500" />
                Delivery & Terms
              </span>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="text-slate-400">Address: </span>
                {order.shipping_address || 'Store Pickup / Direct Handover'}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 pt-0.5">
                <span className="text-slate-400">Payment: </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {order.payment_status} ({order.payment_method})
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Ordered Products ({order.items.length})
            </span>
            <div className="table-container">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="table-th">Item & SKU</th>
                    <th className="table-th text-center">Qty</th>
                    <th className="table-th text-right">Unit Price</th>
                    <th className="table-th text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {order.items.map((item) => (
                    <tr key={item.id} className="table-row-hover">
                      <td className="table-td">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.item_name || 'Item'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.item_sku || 'N/A'}
                        </div>
                      </td>
                      <td className="table-td text-center font-medium">
                        {item.quantity} {item.unit_of_measurement || 'units'}
                      </td>
                      <td className="table-td text-right text-slate-500 font-mono">
                        ₹{item.price_at_time.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-td text-right font-semibold text-slate-900 dark:text-slate-100 font-mono">
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
                  <span>Grand Total:</span>
                  <span className="text-blue-600 dark:text-blue-400 text-base font-mono font-bold">
                    ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Update Control Section */}
          <div className="card-base p-4 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-blue-500" />
              Update Fulfillment Status
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                className="select-base text-xs flex-1"
              >
                <option value="Pending">Pending (No stock deduction)</option>
                <option value="Confirmed">Confirmed (Deduct stock)</option>
                <option value="Dispatched">Dispatched (In-transit)</option>
                <option value="Delivered">Delivered (Completed)</option>
                <option value="Cancelled">Cancelled (Restore stock)</option>
              </select>

              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating || targetStatus === order.status}
                className="btn-primary text-xs py-2 px-4 w-full sm:w-auto"
              >
                {updating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <span>Apply Transition</span>
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={() => executeStatusUpdate('Cancelled')}
        title="Cancel Sales Order"
        subtitle="Automatic inventory stock release"
        message={`Are you sure you want to cancel Order ${order.order_number}? Previously deducted stock for all order line items will automatically be restored back to warehouse available counts.`}
        itemName={`Order ${order.order_number} • ₹${order.total_amount.toLocaleString('en-IN')}`}
        itemType="SALES ORDER"
        confirmText="Yes, Cancel Order"
        variant="warning"
      />
    </div>,
    document.body
  );
};
