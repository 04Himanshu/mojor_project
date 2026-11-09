import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { InvoiceData, Order } from '../../types/order';
import { orderApi } from '../../services/orderApi';
import { 
  X, 
  Printer, 
  Receipt, 
  FileText, 
  Copy, 
  Check, 
  ShieldCheck, 
  User, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Store,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Converts Indian Rupee numerical amounts to formal standard words
 * Example: 1050.20 -> "One Thousand Fifty Rupees and Twenty Paise Only"
 */
function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount <= 0) return 'Zero Rupees Only';

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return singleDigits[n];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit ? ' ' + singleDigits[unit] : ''}`;
  };

  const convertThreeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const hundredStr = hundred ? `${singleDigits[hundred]} Hundred` : '';
    const restStr = rest ? convertTwoDigits(rest) : '';
    if (hundredStr && restStr) return `${hundredStr} and ${restStr}`;
    return hundredStr || restStr;
  };

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remainder = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${convertTwoDigits(crore)} Crore`);
  if (lakh) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (remainder) parts.push(convertThreeDigits(remainder));

  const rupeesInWords = parts.join(' ').trim() || 'Zero';
  const paiseInWords = paise > 0 ? ` and ${convertTwoDigits(paise)} Paise` : '';

  return `${rupeesInWords} Rupees${paiseInWords} Only`;
}

/**
 * Pure SVG Barcode Generator (Code 128 Style Simulation)
 */
const BarcodeDisplay: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => {
  const bars = Array.from(value).flatMap((char) => {
    const code = char.charCodeAt(0);
    return [
      (code % 3) + 1,
      ((code >> 1) % 2) + 1,
      ((code >> 2) % 3) + 1,
      1
    ];
  });

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg className="h-8 w-44 sm:w-52 text-slate-800" viewBox={`0 0 ${bars.length * 2.5} 32`} preserveAspectRatio="none">
        {bars.map((width, idx) => {
          if (idx % 2 === 0) {
            return (
              <rect
                key={idx}
                x={bars.slice(0, idx).reduce((sum, w) => sum + w * 2.2, 0)}
                y="0"
                width={width * 1.8}
                height="32"
                fill="currentColor"
              />
            );
          }
          return null;
        })}
      </svg>
      <span className="font-mono text-[9px] tracking-[0.22em] text-slate-500 mt-0.5 uppercase font-semibold">
        *{value}*
      </span>
    </div>
  );
};

export const InvoiceModal: React.FC<Props> = ({ order, isOpen, onClose }) => {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'invoice' | 'receipt'>('invoice');
  const [copied, setCopied] = useState(false);

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

  const handleCopyInvoiceNumber = () => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice.invoice_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculations & Breakdown
  const subtotal = invoice ? invoice.subtotal : order.subtotal;
  const taxRate = invoice ? invoice.tax_rate : order.tax_rate;
  const taxAmount = invoice ? invoice.tax_amount : order.tax_amount;
  const discountAmount = invoice ? invoice.discount_amount : order.discount_amount;
  const totalAmount = invoice ? invoice.total_amount : order.total_amount;
  const isPaid = (invoice ? invoice.payment_status : order.payment_status) === 'Paid';
  const paymentMethod = invoice ? invoice.payment_method : order.payment_method;
  const gatewayRef = invoice?.cf_payment_id || order.cf_payment_id || order.cf_order_id;
  const cgstAmount = taxRate > 0 ? Number((taxAmount / 2).toFixed(2)) : 0;
  const sgstAmount = taxRate > 0 ? Number((taxAmount / 2).toFixed(2)) : 0;

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Print Stylesheet Injection */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: ${format === 'receipt' ? '4mm' : '8mm 10mm'};
          }
          body {
            visibility: hidden !important;
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #printable-invoice-wrapper,
          #printable-invoice-wrapper * {
            visibility: visible !important;
          }
          #printable-invoice-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${format === 'receipt' ? '80mm' : '100%'} !important;
            max-width: ${format === 'receipt' ? '80mm' : '100%'} !important;
            margin: 0 auto !important;
            padding: ${format === 'receipt' ? '0 !important' : '0 4mm !important'};
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden shadow-2xl flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top Control Toolbar (hidden in print) */}
        <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <Receipt size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  Sales Document & Receipt
                </span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                  {order.order_number}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official store tax invoice, thermal counter slip & transaction receipt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Format Toggle Tabs */}
            <div className="bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setFormat('invoice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  format === 'invoice'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Full A4 Executive Tax Invoice for B2B/B2C records"
              >
                <FileText size={13} />
                <span>Tax Invoice (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('receipt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  format === 'receipt'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Compact 80mm POS Thermal Slip for counter handover"
              >
                <Receipt size={13} />
                <span>POS Slip (80mm)</span>
              </button>
            </div>

            {/* Print Action Button */}
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Document</span>
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Paper Viewport */}
        <div className="overflow-y-auto p-3 sm:p-6 md:p-8 bg-slate-950 flex justify-center">
          {loading ? (
            <div className="py-28 text-center text-slate-400 flex flex-col items-center justify-center">
              <span className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block mb-3" />
              <p className="text-sm font-medium text-slate-300">Generating compliant invoice & tax receipt...</p>
              <p className="text-xs text-slate-500 mt-1">Calculating GST breakdown and verifying settlement records</p>
            </div>
          ) : invoice ? (
            <div 
              id="printable-invoice-wrapper"
              className={`w-full transition-all duration-200 ${
                format === 'invoice' ? 'max-w-3xl' : 'max-w-md'
              }`}
            >
              {format === 'invoice' ? (
                /* ========================================================================= */
                /* FORMAT 1: EXECUTIVE TAX INVOICE (A4 FULL SPREAD)                          */
                /* ========================================================================= */
                <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-10 border border-slate-200 font-sans print:shadow-none print:border-none print:p-0 print:rounded-none">
                  
                  {/* Top Compliance Bar */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium pb-4 border-b border-slate-200 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-emerald-600" />
                      TAX INVOICE • SEC. 31 CENTRAL GOODS & SERVICES TAX ACT
                    </span>
                    <span className="font-semibold text-slate-700">ORIGINAL FOR RECIPIENT</span>
                  </div>

                  {/* Header Branding & Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 pb-6 border-b border-slate-200">
                    {/* Company Branding */}
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
                          EOM
                        </div>
                        <div>
                          <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                            {invoice.company_name}
                          </h1>
                          <span className="text-[10px] font-semibold text-blue-700 tracking-wide block uppercase">
                            Enterprise Operations & Retail POS
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-0.5 leading-relaxed mt-2.5">
                        <p className="flex items-start gap-1.5">
                          <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                          <span>{invoice.company_address}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-[11px]">
                          <Phone size={11} className="text-slate-400 shrink-0" />
                          <span>{invoice.company_phone}</span>
                          <span className="text-slate-300">•</span>
                          <Mail size={11} className="text-slate-400 shrink-0" />
                          <span>{invoice.company_email}</span>
                        </p>
                        <p className="text-[11px] font-mono font-bold text-slate-800 pt-1">
                          GSTIN / UIN: <span className="text-blue-700">{invoice.company_gstin}</span>
                        </p>
                      </div>
                    </div>

                    {/* Invoice ID & Date Block */}
                    <div className="sm:text-right flex flex-col sm:items-end justify-between">
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-slate-900 group">
                          <span>{invoice.invoice_number}</span>
                          <button
                            type="button"
                            onClick={handleCopyInvoiceNumber}
                            className="no-print text-slate-400 hover:text-blue-600 transition-colors ml-1 cursor-pointer"
                            title="Copy Invoice #"
                          >
                            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 space-y-0.5 font-sans">
                          <div>
                            Date:{' '}
                            <strong className="text-slate-800 font-semibold">
                              {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </strong>{' '}
                            at{' '}
                            <span className="text-slate-700">
                              {new Date(invoice.invoice_date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                          <div>
                            Order Reference:{' '}
                            <strong className="text-slate-800 font-mono font-semibold">
                              {invoice.order_number}
                            </strong>
                          </div>
                          <div>
                            Place of Supply:{' '}
                            <span className="text-slate-700 font-medium">Karnataka (Code 29)</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Clearance Badge */}
                      <div className="mt-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>PAID IN FULL</span>
                            </>
                          ) : (
                            <>
                              <Clock size={13} className="text-amber-600" />
                              <span>PAYMENT DUE</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seller & Customer Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                    {/* Billed By Box */}
                    <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Billed By (Merchant):
                      </span>
                      <div className="font-bold text-slate-900 text-sm">{invoice.company_name}</div>
                      <div className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                        Retail POS Terminal Counter #1
                      </div>
                      <div className="text-slate-600 text-[11px] mt-1 flex items-center gap-1">
                        <Store size={12} className="text-blue-600" />
                        <span>Staff / Cashier: <strong className="text-slate-800">{invoice.user_name || 'Staff Member'}</strong></span>
                      </div>
                    </div>

                    {/* Billed To Box */}
                    <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Billed To (Customer):
                      </span>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span>{invoice.customer_name}</span>
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5 space-y-0.5">
                        {invoice.customer_phone && (
                          <div className="font-mono">Contact: {invoice.customer_phone}</div>
                        )}
                        {invoice.customer_email && (
                          <div>Email: {invoice.customer_email}</div>
                        )}
                        <div>Handover: <span className="font-medium text-slate-800">{invoice.shipping_address || 'In-Store Counter Handover'}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div className="mt-5">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-y-2 border-slate-900 bg-slate-100/80 text-slate-900 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-2 text-center w-8">#</th>
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-2">SKU / Code</th>
                          <th className="py-2.5 px-2 text-center">Qty</th>
                          <th className="py-2.5 px-2 text-right">Unit Rate (₹)</th>
                          <th className="py-2.5 px-2 text-center">GST</th>
                          <th className="py-2.5 px-3 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {invoice.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-2 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 block text-xs">
                                {item.item_name || 'Standard Inventory Item'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                HSN: 8471 • Quality Inspected
                              </span>
                            </td>
                            <td className="py-3 px-2 font-mono text-slate-600 text-[11px]">
                              {item.item_sku || 'N/A'}
                            </td>
                            <td className="py-3 px-2 text-center font-medium text-slate-800">
                              {item.quantity}{' '}
                              <span className="text-[10px] text-slate-500">
                                {item.unit_of_measurement || 'pcs'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-medium text-slate-700">
                              ₹{item.price_at_time.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-600">
                              {(taxRate * 100).toFixed(0)}%
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                              ₹{item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations & Settlement Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-5 pb-6 border-t-2 border-slate-900 mt-4">
                    {/* Left: Words & Payment Verification */}
                    <div className="sm:col-span-7 space-y-4">
                      {/* Amount in words */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Amount Chargeable in Words:
                        </span>
                        <div className="text-xs font-semibold text-slate-900 italic mt-0.5">
                          {numberToIndianWords(totalAmount)}
                        </div>
                      </div>

                      {/* Payment Settlement Audit Card */}
                      <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 bg-white">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <CreditCard size={13} className="text-blue-600" />
                            Settlement Details
                          </span>
                          <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {paymentMethod}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-2 pt-0.5">
                          <div>
                            Payment Status:{' '}
                            <strong className={isPaid ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                              {isPaid ? 'Cleared (100%)' : 'Pending'}
                            </strong>
                          </div>
                          <div>
                            Channel:{' '}
                            <span className="font-medium text-slate-800">
                              {invoice.payment_gateway || (paymentMethod === 'Cash' ? 'Counter Tender' : 'Digital PG')}
                            </span>
                          </div>
                          {gatewayRef && (
                            <div className="col-span-2 font-mono text-[10px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200">
                              PG Ref / Auth ID: <strong className="text-slate-900">{gatewayRef}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Financial Computation Breakdown */}
                    <div className="sm:col-span-5 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {taxAmount > 0 && (
                        <>
                          <div className="flex justify-between text-slate-600 text-[11px]">
                            <span>CGST ({(taxRate * 50).toFixed(1)}%):</span>
                            <span className="font-mono text-slate-800 font-medium">
                              +₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600 text-[11px]">
                            <span>SGST ({(taxRate * 50).toFixed(1)}%):</span>
                            <span className="font-mono text-slate-800 font-medium">
                              +₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-200">
                            <span>Total GST ({(taxRate * 100).toFixed(0)}%):</span>
                            <span className="font-mono text-slate-900">
                              +₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </>
                      )}

                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-medium pt-1">
                          <span>Special Discount:</span>
                          <span className="font-semibold font-mono">
                            -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="pt-2.5 border-t-2 border-slate-900 flex justify-between items-baseline text-slate-900">
                        <span className="text-sm font-black tracking-tight">Grand Total:</span>
                        <span className="text-lg font-black text-blue-700 font-mono">
                          ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures & Barcode Verification Footer */}
                  <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6">
                    <div className="flex flex-col items-center sm:items-start">
                      <BarcodeDisplay value={invoice.invoice_number} />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Scan at counter terminal for speedy returns or warranty lookup
                      </p>
                    </div>

                    <div className="text-center sm:text-right min-w-[200px]">
                      <div className="font-bold text-xs text-slate-900">
                        For {invoice.company_name}
                      </div>
                      <div className="h-10 flex items-center justify-center sm:justify-end">
                        <span className="font-serif italic text-sm text-slate-400 select-none">
                          Authorized E-Sign
                        </span>
                      </div>
                      <div className="border-t border-slate-300 pt-1 text-[11px] font-semibold text-slate-700">
                        Authorized Signatory / Cashier
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {invoice.user_name || 'Counter Operations'}
                      </div>
                    </div>
                  </div>

                  {/* Terms & Return Policy */}
                  <div className="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-500 leading-relaxed space-y-0.5">
                    <p className="font-bold text-slate-700 text-[11px] mb-1">Terms & Conditions of Sale:</p>
                    <p>1. Goods once sold can be exchanged within 7 days against original receipt in unused condition.</p>
                    <p>2. Electronic & hardware parts carry manufacturer warranty only; physical/liquid damage voids coverage.</p>
                    <p>3. This is an authenticated computer-generated invoice issued in accordance with GST statutory guidelines.</p>
                  </div>
                </div>
              ) : (
                /* ========================================================================= */
                /* FORMAT 2: THERMAL POS SLIP (80MM COMPACT COUNTER RECEIPT)                 */
                /* ========================================================================= */
                <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-6 border border-slate-200 font-mono text-xs max-w-sm mx-auto print:shadow-none print:border-none print:p-0 print:rounded-none">
                  {/* Top Store Header */}
                  <div className="text-center pb-4 border-b border-dashed border-slate-400">
                    <div className="font-black text-base text-slate-950 uppercase tracking-wider">
                      {invoice.company_name}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1 leading-snug">
                      {invoice.company_address}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Tel: {invoice.company_phone}
                    </div>
                    <div className="text-[10px] font-bold text-slate-800 mt-1">
                      GSTIN: {invoice.company_gstin}
                    </div>
                  </div>

                  {/* Receipt Meta */}
                  <div className="py-3 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                    <div className="text-center font-bold text-xs uppercase tracking-widest text-slate-900 pb-1">
                      *** COUNTER SALES SLIP ***
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Slip No:</span>
                      <span className="font-bold text-slate-900">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date/Time:</span>
                      <span>
                        {new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}{' '}
                        {new Date(invoice.invoice_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">POS Cashier:</span>
                      <span className="text-slate-900 font-semibold">{invoice.user_name || 'Staff'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Customer:</span>
                      <span className="text-slate-900 truncate max-w-[150px]">{invoice.customer_name}</span>
                    </div>
                    {invoice.customer_phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Phone:</span>
                        <span>{invoice.customer_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Itemized Table */}
                  <div className="py-3 border-b border-dashed border-slate-400">
                    <div className="flex justify-between font-bold text-[10px] uppercase text-slate-700 pb-1 border-b border-slate-300">
                      <span>Item / Qty x Rate</span>
                      <span className="text-right">Amount (₹)</span>
                    </div>

                    <div className="divide-y divide-slate-100 py-1">
                      {invoice.items.map((item, idx) => (
                        <div key={idx} className="py-1.5 text-[11px]">
                          <div className="font-bold text-slate-900 truncate">
                            {item.item_name || 'Standard Item'}
                          </div>
                          <div className="flex justify-between text-slate-600 text-[10px] mt-0.5">
                            <span>
                              {item.quantity} {item.unit_of_measurement || 'pcs'} @ ₹{item.price_at_time.toFixed(2)}
                            </span>
                            <span className="font-bold text-slate-900 font-mono text-[11px]">
                              ₹{item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Computation Breakdown */}
                  <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
                    </div>

                    {taxAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>GST ({(taxRate * 100).toFixed(0)}%):</span>
                        <span>+₹{taxAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Discount:</span>
                        <span>-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-900">
                      <span>NET AMOUNT:</span>
                      <span className="text-base text-blue-700">₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Settlement & Status */}
                  <div className="py-3 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Payment Channel:</span>
                      <span className="font-bold text-slate-900">{paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Payment Status:</span>
                      <span className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isPaid ? 'PAID IN FULL (100%)' : 'UNPAID'}
                      </span>
                    </div>
                    {gatewayRef && (
                      <div className="text-[10px] text-slate-600 break-all pt-1">
                        Ref: <span className="font-mono text-slate-900">{gatewayRef}</span>
                      </div>
                    )}
                  </div>

                  {/* Barcode & Thank You */}
                  <div className="pt-4 text-center space-y-2">
                    <BarcodeDisplay value={invoice.invoice_number} className="justify-center" />
                    <div className="text-[10px] text-slate-500 font-sans leading-tight pt-1">
                      Thank you for your visit! Please retain this slip for exchanges within 7 days.
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
