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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50 ring-1 ring-black/5 dark:ring-white/10 flex flex-col modal-content-animate my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
              {order.order_number}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Order Overview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Created on {new Date(order.created_at).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenInvoice(order)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-900 transition-colors flex items-center gap-1.5"
            >
              <FileText size={14} />
              View Invoice
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Order Lifecycle Progress Bar */}
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Order Lifecycle Progress
            </p>

            {isCancelled ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <XCircle size={16} />
                Order was Cancelled. Any previously deducted inventory stock has been restored.
              </div>
            ) : (
              <div className="flex items-center justify-between relative px-2">
                {/* Connecting Line */}
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />
                <div
                  className="absolute top-4 left-6 h-0.5 bg-blue-600 dark:bg-blue-500 transition-all duration-300 -z-0"
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isDone
                            ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                            : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>
                      <span
                        className={`text-[11px] font-semibold mt-1.5 ${
                          isCurrent
                            ? 'text-blue-600 dark:text-blue-400'
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
            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              order.stock_deducted
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {order.stock_deducted ? <PackageCheck size={18} /> : <PackageX size={18} />}
              <span>
                {order.stock_deducted
                  ? 'Physical Stock Deducted: Inventory units have been securely locked and deducted from the warehouse.'
                  : 'Pending Stock Allocation: Stock is not deducted while in Pending status. Moving to Confirmed triggers atomic deduction.'}
              </span>
            </div>
          </div>

          {/* Customer & Shipping Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-blue-500" />
                Customer Details
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {order.customer_name}
              </div>
              {order.customer_email && (
                <div className="text-xs text-slate-500">{order.customer_email}</div>
              )}
              {order.customer_phone && (
                <div className="text-xs text-slate-500">{order.customer_phone}</div>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-emerald-500" />
                Delivery & Payment
              </span>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="text-slate-400">Address: </span>
                {order.shipping_address || 'Customer Handover / Store Pickup'}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="text-slate-400">Payment: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {order.payment_status} ({order.payment_method})
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
              Ordered Products ({order.items.length})
            </h3>
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Item & SKU</th>
                    <th className="py-2.5 px-4 text-center">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Price at Order</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {order.items.map((item) => (
                    <tr key={item.id} className="text-slate-800 dark:text-slate-200">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.item_name || 'Item'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.item_sku || 'N/A'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold">
                        {item.quantity} {item.unit_of_measurement || 'units'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 font-mono">
                        ₹{item.price_at_time.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                        ₹{item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Calculation Breakdown */}
              <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    ₹{order.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>GST ({(order.tax_rate * 100).toFixed(0)}%):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      +₹{order.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Discount:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      -₹{order.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-slate-100">
                  <span>Grand Total:</span>
                  <span className="text-blue-600 dark:text-blue-400 text-base font-mono font-bold">
                    ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Update Control Section */}
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-blue-500" />
              Change Order Status
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                className="w-full sm:w-64 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {updating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Apply Transition'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer matching ItemModal */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
        itemName={`Order #${order.order_number} • ₹${order.total_amount.toLocaleString('en-IN')}`}
        itemType="SALES ORDER"
        confirmText="Yes, Cancel Order"
        variant="warning"
      />
    </div>,
    document.body
  );
};
