import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
  QrCode,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Coins
} from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';
import { paymentApi } from '../../services/paymentApi';
import { useToast } from '../../context/ToastContext';

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
  onCashfreeSuccess?: (order: any) => void;
  submitting: boolean;
  grandTotal: number;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discountAmount: number;
  cart: PaymentCartItem[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerMode: 'walkin' | 'registered';
  selectedCustomerId?: number | '';
  paymentMethod: 'Cash' | 'QR Code' | 'UPI' | 'Card';
  setPaymentMethod: (m: 'Cash' | 'QR Code' | 'UPI' | 'Card') => void;
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
  onCashfreeSuccess,
  submitting,
  grandTotal,
  subtotal,
  taxAmount,
  taxRate,
  discountAmount,
  cart,
  customerName,
  customerPhone,
  customerEmail,
  customerMode,
  selectedCustomerId,
  paymentMethod,
  setPaymentMethod,
  cashTendered,
  setCashTendered,
  paymentStatus,
  setPaymentStatus,
  notes,
  setNotes,
}) => {
  const { toast } = useToast();

  // Cashfree PG State
  const [cfLoading, setCfLoading] = useState(false);
  const [cfOrderId, setCfOrderId] = useState<string | null>(null);
  const [cfError, setCfError] = useState<string | null>(null);
  const [cfPhone, setCfPhone] = useState(customerPhone || '');
  const [cfEmail, setCfEmail] = useState(customerEmail || '');

  // Keep phone/email in sync if parent props change
  useEffect(() => {
    if (customerPhone) setCfPhone(customerPhone);
    if (customerEmail) setCfEmail(customerEmail);
  }, [customerPhone, customerEmail]);

  // Set default cash tendered to exact total when modal opens or total changes
  useEffect(() => {
    if (isOpen && paymentMethod === 'Cash' && !cashTendered) {
      setCashTendered(String(Math.ceil(grandTotal)));
    }
  }, [isOpen, paymentMethod, grandTotal, cashTendered, setCashTendered]);

  // Lock background scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !cfLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, submitting, cfLoading]);

  if (!isOpen) return null;

  // Cash tender calculations
  const tenderedNum = parseFloat(cashTendered || '0') || 0;
  const changeDue = Math.max(0, Math.round((tenderedNum - grandTotal) * 100) / 100);
  const isShort = tenderedNum > 0 && tenderedNum < grandTotal;
  const shortfall = isShort ? Math.round((grandTotal - tenderedNum) * 100) / 100 : 0;

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

  const handleLaunchPayment = async () => {
    if (cart.length === 0) {
      toast.warning('Cart is empty. Please add items.', 'Empty Cart');
      return;
    }

    setCfLoading(true);
    setCfError(null);

    try {
      // 1. Create order session via Backend
      const sessionData = await paymentApi.createSession({
        customer_id: customerMode === 'registered' && selectedCustomerId ? Number(selectedCustomerId) : undefined,
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: cfPhone.trim() || undefined,
        customer_email: cfEmail.trim() || undefined,
        shipping_address: 'In-Store Counter Handover',
        tax_rate: taxRate,
        discount_amount: Number(discountAmount) || 0,
        payment_method: paymentMethod,
        notes: notes.trim() || `Counter POS Checkout (${paymentMethod})`,
        items: cart.map((i) => ({ inventory_id: i.inventory_id, quantity: i.quantity }))
      });

      setCfOrderId(sessionData.cf_order_id);

      // 2. Initialize Cashfree Drop SDK
      const cashfree = await load({
        mode: sessionData.environment === 'production' ? 'production' : 'sandbox'
      });

      // 3. Launch Checkout Modal
      const result = await cashfree.checkout({
        paymentSessionId: sessionData.payment_session_id,
        redirectTarget: '_modal'
      });

      if (result?.error) {
        setCfError(result.error.message || 'Payment window closed or cancelled.');
        toast.warning(result.error.message || 'Payment window closed.', 'Gateway Notice');
      }

      // 4. Verify Settlement with Backend
      const verifyRes = await paymentApi.verifyPayment(sessionData.cf_order_id);
      if (verifyRes.success && verifyRes.order) {
        toast.success(`Payment verified! Order ${verifyRes.order.order_number} settled.`, 'Payment Confirmed');
        if (onCashfreeSuccess) {
          onCashfreeSuccess(verifyRes.order);
        }
      } else {
        setCfError(verifyRes.message || 'Payment awaiting customer confirmation.');
      }
    } catch (err: any) {
      console.error('Cashfree PG error:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to initiate Cashfree checkout.';
      const detailStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      setCfError(detailStr);
      toast.error(detailStr, 'Gateway Error');
    } finally {
      setCfLoading(false);
    }
  };

  const handleVerifyStatus = async () => {
    if (!cfOrderId) return;
    setCfLoading(true);
    try {
      const verifyRes = await paymentApi.verifyPayment(cfOrderId);
      if (verifyRes.success && verifyRes.order) {
        toast.success(`Payment confirmed! Order ${verifyRes.order.order_number} settled.`, 'Settlement Confirmed');
        if (onCashfreeSuccess) {
          onCashfreeSuccess(verifyRes.order);
        }
      } else {
        toast.info(verifyRes.message || 'Payment status still pending.', 'Payment Status');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Verification failed', 'Verification Error');
    } finally {
      setCfLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'Cash') {
      if (isShort) {
        toast.warning(
          `Cash tendered (₹${tenderedNum}) is less than total due (₹${grandTotal.toFixed(2)}).`,
          'Insufficient Cash'
        );
        return;
      }
      onCompleteSale();
      return;
    }
    handleLaunchPayment();
  };

  const getMethodBadge = () => {
    switch (paymentMethod) {
      case 'Cash':
        return 'Physical Currency';
      case 'QR Code':
        return 'Dynamic QR Code';
      case 'UPI':
        return 'UPI Apps & VPA';
      case 'Card':
        return 'Credit & Debit Cards';
    }
  };

  return createPortal(
    <div
      role="region"
      aria-label="POS Checkout & Settlement Screen"
      className="fixed inset-0 z-[200] w-screen h-screen min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden animate-fadeIn"
    >
      {/* Top Header Navigation Bar */}
      <header className="h-14 px-4 sm:px-6 lg:px-8 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || cfLoading}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Return to Walk-in Counter Cart"
          >
            <ArrowLeft size={14} />
            <span className="font-semibold">Back to Cart</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Receipt size={16} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                POS Payment & Settlement
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden sm:inline">Total Payable:</span>
          <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800/80">
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Payment Method
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Choose cash tender or online digital settlement
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 font-mono">
                  {getMethodBadge()}
                </span>
              </div>

              {/* 4 Streamlined Payment Channels: Cash, QR Code, UPI, Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    id: 'Cash' as const,
                    label: 'Cash Tender',
                    desc: 'Physical Currency',
                    badge: 'Immediate',
                    icon: <Banknote size={18} />
                  },
                  {
                    id: 'QR Code' as const,
                    label: 'Dynamic QR',
                    desc: 'Scan on Screen',
                    badge: 'Instant UPI',
                    icon: <QrCode size={18} />
                  },
                  {
                    id: 'UPI' as const,
                    label: 'UPI Apps',
                    desc: 'GPay, PhonePe, VPA',
                    badge: 'Direct UPI',
                    icon: <Smartphone size={18} />
                  },
                  {
                    id: 'Card' as const,
                    label: 'Cards',
                    desc: 'Debit & Credit',
                    badge: '3D Secure',
                    icon: <CreditCard size={18} />
                  },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {m.icon}
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                        )}
                      </div>

                      <div className="mt-2.5">
                        <div className="font-bold text-xs truncate">
                          {m.label}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-400 truncate leading-tight mt-0.5">
                          {m.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Method Workspace Area */}
              <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/50 mt-3 space-y-4">
                
                {/* 1. CASH PAYMENT WORKSPACE */}
                {paymentMethod === 'Cash' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <div>
                        <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Coins size={15} className="text-emerald-500" />
                          <span>Cash Tendered by Customer</span>
                        </label>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Enter physical cash handed over at the counter
                        </p>
                      </div>

                      <div className="relative w-full sm:w-48">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder="0.00"
                          className="input-base pl-8 pr-3 py-2 text-right font-mono text-lg font-black w-full bg-slate-50 dark:bg-slate-900/80"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Quick Cash Presets */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quick Cash Denominations
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {quickCashSuggestions.map((amt) => {
                          const isCurrent = Math.abs(parseFloat(cashTendered || '0') - amt) < 0.01;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashTendered(String(amt))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                              }`}
                            >
                              {amt === Math.ceil(grandTotal) ? `Exact (₹${amt})` : `₹${amt.toLocaleString('en-IN')}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Change Due / Shortfall Indicator */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          isShort
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                        }`}>
                          <Banknote size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            {isShort ? 'Shortfall Amount' : 'Change to Return Customer'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isShort ? 'Customer tendered less than payable' : 'Return exact balance to customer'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isShort ? (
                          <span className="inline-flex items-center gap-1 font-mono font-black text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900">
                            <AlertCircle size={13} />
                            Short by ₹{shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">
                            ₹{changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DYNAMIC QR CODE WORKSPACE */}
                {paymentMethod === 'QR Code' && (
                  <div className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="w-28 h-28 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-blue-600/30 dark:border-blue-500/30 flex flex-col items-center justify-center shrink-0 shadow-2xs relative">
                        <QrCode size={64} className="text-blue-600 dark:text-blue-400 animate-pulse" />
                        <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 font-mono tracking-wider mt-1">
                          DYNAMIC QR
                        </span>
                      </div>

                      <div className="flex-1 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            Instant Counter Dynamic QR Code
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            Auto-Detect
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Click below to open a live dynamic QR code for <strong className="text-slate-800 dark:text-slate-200">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> on the counter. Customer scans using any UPI camera to settle immediately.
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pt-1">
                          <Sparkles size={12} className="text-amber-500" />
                          <span>Works with Google Pay, PhonePe, Paytm, BHIM & CRED.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. UPI APPS & VPA WORKSPACE */}
                {paymentMethod === 'UPI' && (
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <Smartphone size={15} className="text-blue-500" />
                          UPI App Collection & VPA ID
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                          Direct Settle
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Customer can approve payment of <strong className="text-slate-800 dark:text-slate-200">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> directly in their mobile UPI application or by entering their UPI ID (e.g. name@okhdfcbank).
                      </p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {['PhonePe', 'Google Pay', 'Paytm', 'BHIM UPI', 'CRED'].map((app) => (
                          <span
                            key={app}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CARD PAYMENT WORKSPACE */}
                {paymentMethod === 'Card' && (
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <CreditCard size={15} className="text-indigo-500" />
                          Debit & Credit Card Gateway
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                          <ShieldCheck size={11} />
                          3D Secure
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Customer enters card details securely with 128-bit encryption and bank OTP verification for <strong className="text-slate-800 dark:text-slate-200">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        {['Visa', 'Mastercard', 'RuPay', 'American Express'].map((card) => (
                          <span
                            key={card}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {card}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Contact inputs (for digital methods or cash receipt SMS) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      Customer Phone (Optional for SMS receipt)
                    </label>
                    <input
                      type="tel"
                      value={cfPhone}
                      onChange={(e) => setCfPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="input-base text-xs py-1.5 w-full font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      Customer Email (Email invoice)
                    </label>
                    <input
                      type="email"
                      value={cfEmail}
                      onChange={(e) => setCfEmail(e.target.value)}
                      placeholder="customer@domain.com"
                      className="input-base text-xs py-1.5 w-full font-mono"
                    />
                  </div>
                </div>

                {/* Error Banner for Gateway */}
                {cfError && paymentMethod !== 'Cash' && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                    <div className="flex-1">
                      <span className="font-semibold block">Gateway Notice</span>
                      <span className="text-[11px]">{cfError}</span>
                    </div>
                  </div>
                )}

                {/* Active Gateway Session Indicator */}
                {cfOrderId && paymentMethod !== 'Cash' && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        Session: <strong>{cfOrderId}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyStatus}
                      disabled={cfLoading}
                      className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <RefreshCw size={12} className={cfLoading ? 'animate-spin' : ''} />
                      <span>Verify Status</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Counter Notes Grid */}
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
                    <option value="Unpaid">Unpaid / Awaiting Settlement</option>
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

              {/* Dynamic CTA Action Button */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting || cfLoading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting || cfLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{paymentMethod === 'Cash' ? 'Finalizing Sale...' : 'Connecting Gateway...'}</span>
                    </>
                  ) : paymentMethod === 'Cash' ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm Cash Sale (₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                    </>
                  ) : paymentMethod === 'QR Code' ? (
                    <>
                      <QrCode size={16} />
                      <span>Launch Dynamic QR (₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                    </>
                  ) : paymentMethod === 'UPI' ? (
                    <>
                      <Smartphone size={16} />
                      <span>Pay via UPI (₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      <span>Pay via Card (₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting || cfLoading}
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
