import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ArrowLeft,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
  QrCode,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export interface PaymentCartItem {
  inventory_id: number;
  item_name: string;
  item_sku: string;
  unit_price: number;
  quantity: number;
  available_stock: number;
  unit_of_measurement: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSale: () => Promise<void> | void;
  submitting: boolean;
  grandTotal: number;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discountAmount: number;
  cart: PaymentCartItem[];
  customerName: string;
  customerPhone: string;
  customerMode: 'walkin' | 'registered';
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
  setPaymentMethod: (m: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer') => void;
  cashTendered: string;
  setCashTendered: (val: string) => void;
  paymentStatus: string;
  setPaymentStatus: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onCompleteSale,
  submitting,
  grandTotal,
  subtotal,
  taxAmount,
  taxRate,
  discountAmount,
  cart,
  customerName,
  customerPhone,
  customerMode,
  paymentMethod,
  setPaymentMethod,
  cashTendered,
  setCashTendered,
  paymentStatus,
  setPaymentStatus,
  notes,
  setNotes,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [cardBrand, setCardBrand] = useState<'Visa' | 'Mastercard' | 'RuPay' | 'Amex'>('Visa');
  const [transactionRef, setTransactionRef] = useState('');

  // Lock background scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, submitting]);

  // Set default cash tendered to exact total when modal opens or total changes
  useEffect(() => {
    if (isOpen && paymentMethod === 'Cash' && !cashTendered) {
      setCashTendered(String(Math.ceil(grandTotal)));
    }
  }, [isOpen, paymentMethod, grandTotal, cashTendered, setCashTendered]);

  if (!isOpen) return null;

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);
  const isShort = tenderedNum > 0 && tenderedNum < grandTotal;

  // Dynamic quick denomination suggestions
  const quickCashSuggestions = (() => {
    const suggestions = new Set<number>();
    const total = Math.ceil(grandTotal);
    suggestions.add(total);

    const next50 = Math.ceil(total / 50) * 50;
    if (next50 > total) suggestions.add(next50);

    const next100 = Math.ceil(total / 100) * 100;
    if (next100 > total) suggestions.add(next100);

    const next500 = Math.ceil(total / 500) * 500;
    if (next500 > total) suggestions.add(next500);

    const next1000 = Math.ceil(total / 1000) * 1000;
    if (next1000 > total) suggestions.add(next1000);

    return Array.from(suggestions).sort((a, b) => a - b).slice(0, 5);
  })();

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('storepos@icici');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCompleteSale();
  };

  return createPortal(
    <div
      role="region"
      aria-label="POS Checkout & Settlement Screen"
      className="fixed inset-0 z-[200] w-screen h-screen min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden animate-fadeIn"
    >
      {/* Full-Page Top Navigation Bar */}
      <header className="h-14 px-4 sm:px-6 lg:px-8 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Return to Walk-in Counter Cart"
          >
            <ArrowLeft size={14} />
            <span className="font-semibold">Back to Cart</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CreditCard size={15} />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
              Payment & Settlement
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden sm:inline">Payable:</span>
          <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/80">
            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </header>

      {/* Full-Page Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleFormSubmit} className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start pb-8">
          
          {/* Left Column: Payment Methods & Configuration (7 cols on lg/xl) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-4">
            
            {/* Payment Method Selector Card */}
            <div className="card-base p-4 sm:p-5 space-y-3.5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Payment Method
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Choose customer's tender or settlement channel
                </p>
              </div>

              {/* Reduced, Compact Payment Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {[
                  { id: 'Cash', label: 'Cash', desc: 'Notes & Coins', icon: <Banknote size={15} /> },
                  { id: 'UPI', label: 'UPI / QR', desc: 'Scan to pay', icon: <Smartphone size={15} /> },
                  { id: 'Card', label: 'Card POS', desc: 'Swipe / Tap', icon: <CreditCard size={15} /> },
                  { id: 'Bank Transfer', label: 'Transfer', desc: 'NEFT / IMPS', icon: <Building2 size={15} /> },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2 sm:p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {m.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs truncate flex items-center justify-between">
                          <span>{m.label}</span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0 ml-1" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-400 truncate leading-tight mt-0.5">
                          {m.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Method-Specific Features Workspace */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/50 mt-3">
                {/* CASH PAYMENT FEATURES */}
                {paymentMethod === 'Cash' && (
                  <div className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Banknote size={15} className="text-emerald-500" />
                          Cash Tendered by Customer
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">Physical currency handed over at counter</p>
                      </div>

                      <div className="relative w-full sm:w-44">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder="0.00"
                          className="input-base pl-7 pr-3 py-1.5 text-right font-mono text-base font-bold w-full"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Quick Denomination Presets */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Quick Cash Notes
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {quickCashSuggestions.map((amt) => {
                          const isCurrent = Math.abs(parseFloat(cashTendered) - amt) < 0.01;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashTendered(String(amt))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                              }`}
                            >
                              {amt === Math.ceil(grandTotal) ? `Exact (₹${amt})` : `₹${amt.toLocaleString('en-IN')}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Change Due / Shortfall Indicator Card */}
                    <div className="pt-2.5 border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Change to Return Customer:
                      </span>
                      <div className="text-right">
                        {isShort ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                            <AlertCircle size={12} />
                            Short by ₹{(grandTotal - tenderedNum).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
                            ₹{changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI / QR FEATURES */}
                {paymentMethod === 'UPI' && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
                    {/* Visual QR Code Display */}
                    <div className="w-32 h-32 rounded-xl bg-white p-2.5 border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 shadow-2xs relative">
                      <QrCode size={90} className="text-slate-900" />
                      <span className="text-[9px] font-bold text-blue-600 font-mono tracking-wider mt-1">
                        SCAN TO PAY
                      </span>
                    </div>

                    <div className="flex-1 space-y-2 text-xs w-full">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Instant Counter UPI Settlement
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Scan using Google Pay, PhonePe, Paytm, or BHIM.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex-1 truncate">
                          storepos@icici
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedUpi ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="UPI UTR / Reference No. (Optional)"
                          className="input-base text-xs py-1.5 w-full font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD FEATURES */}
                {paymentMethod === 'Card' && (
                  <div className="space-y-3 text-xs py-1">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                      <ShieldCheck size={16} />
                      <span className="font-bold">POS Terminal Machine Handover</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tap, insert, or swipe the customer card on the terminal for <strong>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                          Card Network
                        </label>
                        <div className="flex items-center gap-1.5">
                          {(['Visa', 'Mastercard', 'RuPay', 'Amex'] as const).map((brand) => (
                            <button
                              key={brand}
                              type="button"
                              onClick={() => setCardBrand(brand)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                cardBrand === brand
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {brand}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                          Terminal Approval / RRN Code
                        </label>
                        <input
                          type="text"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="e.g. TXN-948271"
                          className="input-base text-xs py-1 w-full font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* BANK TRANSFER FEATURES */}
                {paymentMethod === 'Bank Transfer' && (
                  <div className="space-y-2.5 text-xs py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        Store Bank Account Details
                      </span>
                      <span className="badge-info text-[9px] py-0 px-1 font-bold">Direct Settlement</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">A/C Number:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">92810192830192</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">IFSC Code:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">ICIC0001928</span>
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="IMPS UTR / Bank Transfer Ref No."
                        className="input-base text-xs py-1.5 w-full font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Status & Counter Notes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="select-base text-xs py-1.5 w-full"
                  >
                    <option value="Paid">Paid in Full (100% Cleared)</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid / Counter Credit</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Counter Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Counter #1, Customer GSTIN"
                    className="input-base text-xs py-1.5 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sale Summary & Settlement Confirmation */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4 lg:sticky lg:top-4">
            <div className="card-base p-4 sm:p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Receipt size={15} className="text-blue-500" />
                    <span>Sale Summary</span>
                  </h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {customerName.trim() || (customerMode === 'registered' ? 'Registered Member' : 'Walk-in Customer')}
                    {customerPhone && <span className="font-mono text-slate-400"> • {customerPhone}</span>}
                  </div>
                </div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2 py-0.5 rounded-full font-mono font-bold">
                  {cart.reduce((a, b) => a + b.quantity, 0)} Units
                </span>
              </div>

              {/* Purchased items list */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {cart.map((item) => (
                  <div
                    key={item.inventory_id}
                    className="p-2 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                        {item.item_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.item_sku} • ₹{item.unit_price.toLocaleString('en-IN')} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white shrink-0 text-xs">
                      ₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial breakdown table */}
              <div className="bg-slate-50/90 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST ({(taxRate * 100).toFixed(0)}%):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    +₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount Applied:</span>
                    <span className="font-mono">
                      -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-700/80 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Due</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{customerName || 'Walk-in'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight block">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Sale...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm & Complete Sale (₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ArrowLeft size={13} />
                  <span>Return to Cart Counter</span>
                </button>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};
