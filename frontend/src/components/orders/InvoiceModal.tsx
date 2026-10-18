import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { InvoiceData, Order } from '../../types/order';
import { orderApi } from '../../services/orderApi';
import { X, Printer, Receipt } from 'lucide-react';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<Props> = ({ order, isOpen, onClose }) => {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);

  // Lock background scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && order) {
      setLoading(true);
      orderApi
        .getOrderInvoice(order.id)
        .then((data) => setInvoice(data))
        .catch((err) => console.error('Failed to load invoice', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
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
        className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50 ring-1 ring-black/5 dark:ring-white/10 flex flex-col modal-content-animate my-auto print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar (hidden in print) */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="text-blue-600 dark:text-blue-400" size={18} />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Tax Invoice Preview
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div id="printable-invoice" className="p-8 sm:p-10 bg-white text-slate-900 print:p-6 print:text-black">
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p className="text-xs">Generating tax invoice...</p>
            </div>
          ) : invoice ? (
            <div className="space-y-8">
              {/* Top Header & Company Info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                      EOM
                    </div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                      {invoice.company_name}
                    </h1>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    {invoice.company_address}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Email: {invoice.company_email} | Phone: {invoice.company_phone}
                  </p>
                  <p className="text-xs font-mono font-semibold text-slate-700 mt-1">
                    GSTIN: {invoice.company_gstin}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-2xl font-black uppercase tracking-wider text-blue-600">
                    TAX INVOICE
                  </div>
                  <div className="mt-1 font-mono font-bold text-sm text-slate-900">
                    {invoice.invoice_number}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Invoice Date:{' '}
                    {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    Order Ref: <span className="font-semibold text-slate-800">{invoice.order_number}</span>
                  </div>

                  {/* Payment Stamp Badge */}
                  <div className="mt-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                        invoice.payment_status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {invoice.payment_status === 'Paid' ? 'PAID IN FULL' : 'PAYMENT PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To & Ship To Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Billed To:
                  </div>
                  <div className="text-sm font-bold text-slate-900">{invoice.customer_name}</div>
                  {invoice.customer_email && (
                    <div className="text-xs text-slate-600">{invoice.customer_email}</div>
                  )}
                  {invoice.customer_phone && (
                    <div className="text-xs text-slate-600">{invoice.customer_phone}</div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Shipping & Payment:
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">Delivery Address: </span>
                    {invoice.shipping_address || 'Customer Handover / Store Pickup'}
                  </div>
                  <div className="text-xs text-slate-700 mt-1">
                    <span className="font-semibold text-slate-900">Payment Mode: </span>
                    {invoice.payment_method}
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5">Item Description</th>
                      <th className="py-2.5">SKU</th>
                      <th className="py-2.5 text-center">Qty</th>
                      <th className="py-2.5 text-right">Unit Price</th>
                      <th className="py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="text-slate-800">
                        <td className="py-3 font-semibold text-slate-900">
                          {item.item_name || 'Item'}
                        </td>
                        <td className="py-3 font-mono text-slate-500 text-[11px]">
                          {item.item_sku || 'N/A'}
                        </td>
                        <td className="py-3 text-center font-medium">
                          {item.quantity} {item.unit_of_measurement || 'units'}
                        </td>
                        <td className="py-3 text-right font-mono">
                          ₹{item.price_at_time.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900 font-mono">
                          ₹{item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Summary Block */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 max-w-xs space-y-1">
                  <div className="font-bold text-slate-800">Terms & Conditions</div>
                  <div>1. Goods once sold are subject to standard warehouse inspection warranty.</div>
                  <div>2. This invoice is computer-generated and legally valid.</div>
                </div>

                <div className="w-full sm:w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      ₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {invoice.tax_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST ({(invoice.tax_rate * 100).toFixed(0)}%):</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        +₹{invoice.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-semibold font-mono">
                        -₹{invoice.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-base text-blue-600 font-black font-mono">
                      ₹{invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authorized Signatory */}
              <div className="pt-8 flex justify-end">
                <div className="text-center w-48 border-t border-slate-300 pt-2">
                  <div className="text-[11px] font-semibold text-slate-800">Authorized Signatory</div>
                  <div className="text-[10px] text-slate-400">Enterprise Operations Manager</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
