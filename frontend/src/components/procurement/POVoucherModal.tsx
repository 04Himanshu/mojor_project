import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PurchaseOrder } from '../../types/procurement';
import { X, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
}

export const POVoucherModal: React.FC<Props> = ({ isOpen, onClose, purchaseOrder }) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !purchaseOrder) return null;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md modal-backdrop-animate overflow-y-auto print:p-0 print:bg-white"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-auto flex flex-col modal-content-animate print:border-none print:shadow-none print:m-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar (hidden on print) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              PURCHASE ORDER VOUCHER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Printer size={14} />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="btn-ghost p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="p-8 space-y-6 text-slate-900 dark:text-slate-100 print:text-black print:p-6 overflow-y-auto max-h-[80vh]">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  EOM
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight">Enterprise Operations Manager</h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Procurement & Supply Chain Division</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5">
                Warehouse Dock 4, Tech Park Industrial Hub<br />
                Bengaluru, KA 560100 • GSTIN: 29AAAAA0000A1Z5
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400 print:text-black">
                {purchaseOrder.po_number}
              </div>
              <div className="text-xs text-slate-500">
                Issued Date:{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(purchaseOrder.order_date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Status:{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {purchaseOrder.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Supplier & Delivery Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 print:bg-white print:border-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Vendor / Supplier
              </span>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {purchaseOrder.supplier_name}
              </div>
              {purchaseOrder.supplier_contact && (
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Attn: {purchaseOrder.supplier_contact}
                </div>
              )}
              {purchaseOrder.supplier_email && (
                <div className="text-xs text-slate-500 mt-0.5">{purchaseOrder.supplier_email}</div>
              )}
              {purchaseOrder.supplier_phone && (
                <div className="text-xs text-slate-500 mt-0.5">{purchaseOrder.supplier_phone}</div>
              )}
              {purchaseOrder.supplier_gstin && (
                <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
                  GSTIN: {purchaseOrder.supplier_gstin}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 print:bg-white print:border-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Delivery & Terms
              </span>
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div>
                  <span className="text-slate-400">Destination:</span>{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">{purchaseOrder.shipping_address || 'Central Warehouse'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Payment Terms:</span>{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">{purchaseOrder.payment_terms}</span>
                </div>
                <div>
                  <span className="text-slate-400">Expected By:</span>{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {purchaseOrder.expected_delivery_date
                      ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'Immediate Fulfillment'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl print:border-slate-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">No.</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">Ordered</th>
                  <th className="py-2.5 px-3 text-right">Inwarded</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchaseOrder.items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {it.item_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{it.item_sku}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">
                      {it.quantity_ordered} {it.unit_of_measurement}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-medium">
                      {it.quantity_received} {it.unit_of_measurement}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      ₹{it.unit_cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      ₹{it.total_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">
                  ₹{purchaseOrder.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>GST ({(purchaseOrder.tax_rate * 100).toFixed(0)}%)</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">
                  ₹{purchaseOrder.tax_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              {purchaseOrder.shipping_cost > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Shipping & Handling</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium">
                    ₹{purchaseOrder.shipping_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-bold text-blue-600 dark:text-blue-400 print:text-black">
                <span>Total Purchase Order</span>
                <span className="font-mono">
                  ₹{purchaseOrder.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Approval */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
            <div>
              <div className="h-12 border-b border-dashed border-slate-300 dark:border-slate-700 mb-2"></div>
              <span>Authorized Procurement Officer</span>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-300 dark:border-slate-700 mb-2"></div>
              <span>Supplier Acceptance & Stamp</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
