import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Customer, OrderCreatePayload } from '../../types/order';
import type { InventoryItem } from '../../types/inventory';
import { inventoryApi } from '../../services/inventoryApi';
import { orderApi } from '../../services/orderApi';
import { useAuth } from '../../context/AuthContext';
import { 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  AlertCircle, 
  Store, 
  ShoppingBag, 
  ReceiptText, 
  Percent, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  User, 
  Users,
  RefreshCw
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

interface ItemRow {
  inventory_id: number;
  quantity: number;
  unit_price: number;
  available_stock: number;
  item_name: string;
  item_sku: string;
  unit_of_measurement: string;
}

export const CreateOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  showNotification
}) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer Mode: 'walkin' or 'registered'
  const [customerMode, setCustomerMode] = useState<'walkin' | 'registered'>('walkin');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<string>('Paid');
  const [taxRate, setTaxRate] = useState<number>(0.18);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Line items cart
  const [itemRows, setItemRows] = useState<ItemRow[]>([
    {
      inventory_id: 0,
      quantity: 1,
      unit_price: 0,
      available_stock: 0,
      item_name: '',
      item_sku: '',
      unit_of_measurement: 'pcs'
    }
  ]);

  // Load inventory items dynamically from DB
  const loadInventoryItems = useCallback(async () => {
    setLoadingItems(true);
    setError(null);
    try {
      const items = await inventoryApi.getLookupItems();
      const activeItems = (items || []).filter((i) => i.is_active);
      setInventoryList(activeItems);
    } catch (err: any) {
      console.error('Failed to load store inventory items dynamically from DB', err);
      setError('Failed to load store inventory items from database. Please verify connection.');
    } finally {
      setLoadingItems(false);
    }
  }, []);

  // Load registered customers independently so failure doesn't block inventory
  const loadCustomers = useCallback(async () => {
    try {
      const custData = await orderApi.getCustomers();
      setCustomers(custData || []);
    } catch (err) {
      console.warn('Customer list could not be loaded', err);
    }
  }, []);

  // Lock body scroll on open
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

  // Load live data from DB on open
  useEffect(() => {
    if (isOpen) {
      loadInventoryItems();
      loadCustomers();
    }
  }, [isOpen, loadInventoryItems, loadCustomers]);

  const handleCustomerSelect = (custId: number) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
      setCustomerEmail(found.email || '');
    }
  };

  const handleItemSelect = (index: number, invId: number) => {
    const itm = inventoryList.find((i) => i.id === invId);
    if (!itm) return;

    const updated = [...itemRows];
    updated[index] = {
      inventory_id: itm.id,
      quantity: 1,
      unit_price: itm.selling_price,
      available_stock: itm.quantity,
      item_name: itm.name,
      item_sku: itm.sku,
      unit_of_measurement: itm.unit_of_measurement || 'pcs'
    };
    setItemRows(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...itemRows];
    updated[index].quantity = Math.max(1, qty);
    setItemRows(updated);
  };

  const handleAddRow = () => {
    setItemRows([
      ...itemRows,
      {
        inventory_id: 0,
        quantity: 1,
        unit_price: 0,
        available_stock: 0,
        item_name: '',
        item_sku: '',
        unit_of_measurement: 'pcs'
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (itemRows.length <= 1) {
      // Clear the single row
      setItemRows([
        {
          inventory_id: 0,
          quantity: 1,
          unit_price: 0,
          available_stock: 0,
          item_name: '',
          item_sku: '',
          unit_of_measurement: 'pcs'
        }
      ]);
      return;
    }
    setItemRows(itemRows.filter((_, idx) => idx !== index));
  };

  // Financial calculations
  const subtotal = itemRows.reduce((acc, row) => {
    if (row.inventory_id > 0) {
      return acc + row.quantity * row.unit_price;
    }
    return acc;
  }, 0);

  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const grandTotal = Math.max(0, Math.round((subtotal + taxAmount - discountAmount) * 100) / 100);

  // Cash change calculation
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, Math.round((tenderedNum - grandTotal) * 100) / 100);

  const hasInsufficientStock = itemRows.some(
    (row) => row.inventory_id > 0 && row.quantity > row.available_stock
  );

  const hasDuplicateItems = () => {
    const ids = itemRows.map((r) => r.inventory_id).filter((id) => id > 0);
    return ids.length !== new Set(ids).size;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validItems = itemRows.filter((r) => r.inventory_id > 0);
    if (validItems.length === 0) {
      setError('Please select at least one item for the customer.');
      return;
    }

    if (hasDuplicateItems()) {
      setError('Duplicate items detected. Please adjust the quantity on a single item row.');
      return;
    }

    if (hasInsufficientStock) {
      setError('One or more items exceed current available store stock.');
      return;
    }

    setSubmitting(true);
    try {
      const finalCustName = customerMode === 'registered' 
        ? customerName 
        : (customerName.trim() || 'Walk-in Customer');

      const payload: OrderCreatePayload = {
        customer_id: customerMode === 'registered' && selectedCustomerId ? Number(selectedCustomerId) : undefined,
        customer_name: finalCustName,
        customer_phone: customerPhone.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        shipping_address: 'In-Store Counter Handover',
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        tax_rate: taxRate,
        discount_amount: Number(discountAmount) || 0,
        notes: notes.trim() || 'Walk-in counter sale',
        items: validItems.map((r) => ({
          inventory_id: r.inventory_id,
          quantity: r.quantity
        }))
      };

      await orderApi.createOrder(payload);
      showNotification('Walk-in counter order completed successfully! Stock deducted.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to complete counter sale.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl shadow-black/50 flex flex-col modal-content-animate my-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 sticky top-0 bg-white/95 dark:bg-[#101726]/95 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Store size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  New Walk-in Counter Sale
                </h2>
                <span className="badge-purple text-[10px] py-0.5 px-2 font-mono">
                  POS Counter
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Staff: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.name || 'Cashier'}</span> • Instant stock deduction & receipt
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Section 1: Customer Identification */}
          <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-blue-500" />
                Customer Walk-in Details
              </span>

              {/* Mode switch */}
              <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('walkin');
                    setSelectedCustomerId('');
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    customerMode === 'walkin'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <User size={12} />
                  <span>Walk-in Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('registered');
                    if (customers.length > 0 && !selectedCustomerId) {
                      handleCustomerSelect(customers[0].id);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    customerMode === 'registered'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Users size={12} />
                  <span>Registered Member</span>
                </button>
              </div>
            </div>

            {customerMode === 'walkin' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="form-label">
                    Customer Name <span className="text-slate-400 font-normal">(Optional, defaults to 'Walk-in Customer')</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="input-base text-xs"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Mobile / Phone <span className="text-slate-400 font-normal">(For e-receipt & contact)</span>
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="input-base font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-1">
                  <label className="form-label">
                    Select Member <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(Number(e.target.value))}
                    required
                    className="select-base text-xs"
                  >
                    <option value="">-- Choose Member --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || c.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Member Name</label>
                  <input
                    type="text"
                    value={customerName}
                    readOnly
                    className="input-base bg-slate-100 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="form-label">Mobile</label>
                  <input
                    type="text"
                    value={customerPhone}
                    readOnly
                    className="input-base bg-slate-100 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Items Cart (The customer buys one or more items) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag size={13} className="text-blue-500" />
                  Purchased Items Cart ({itemRows.filter((r) => r.inventory_id > 0).length})
                  {inventoryList.length > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                      {inventoryList.length} products loaded from DB
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400">
                  Select products the customer is purchasing at the counter
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadInventoryItems}
                  disabled={loadingItems}
                  title="Reload items live from database"
                  className="btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} className={loadingItems ? 'animate-spin text-blue-500' : ''} />
                  <span>{loadingItems ? 'Syncing DB...' : 'Sync DB'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Another Item</span>
                </button>
              </div>
            </div>

            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {itemRows.map((row, idx) => {
                const isOverStock = row.inventory_id > 0 && row.quantity > row.available_stock;
                const lineTotal = row.quantity * row.unit_price;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center transition-colors ${
                      isOverStock ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'bg-white dark:bg-[#101726]'
                    }`}
                  >
                    {/* Item Selector */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                        Product Item {idx + 1}
                      </label>
                      <select
                        value={row.inventory_id}
                        onChange={(e) => handleItemSelect(idx, Number(e.target.value))}
                        required
                        disabled={loadingItems}
                        className="select-base text-xs"
                      >
                        <option value={0}>
                          {loadingItems 
                            ? '-- Loading items from database... --' 
                            : inventoryList.length === 0 
                            ? '-- No active products found in DB --' 
                            : `-- Search / Select Product (${inventoryList.length} items from DB) --`}
                        </option>
                        {inventoryList.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.sku}) • ₹{inv.selling_price.toLocaleString('en-IN')} • {inv.quantity > 0 ? `In Stock: ${inv.quantity} ${inv.unit_of_measurement}` : 'OUT OF STOCK (0)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity with Stepper */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                        Qty ({row.unit_of_measurement})
                      </label>
                      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50/50 dark:bg-slate-800/50">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, row.quantity - 1)}
                          disabled={row.inventory_id === 0 || row.quantity <= 1}
                          className="px-2.5 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                          disabled={row.inventory_id === 0}
                          required
                          className="w-full text-center bg-transparent text-xs font-mono font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, row.quantity + 1)}
                          disabled={row.inventory_id === 0}
                          className="px-2.5 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                        Price
                      </label>
                      <div className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300 font-semibold font-mono border border-slate-200/60 dark:border-slate-700/60 text-right">
                        ₹{row.unit_price.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="sm:col-span-1 text-right">
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                        Total
                      </label>
                      <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 pt-1 tabular-nums">
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="sm:col-span-1 text-right pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        title="Remove item"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Stock Alert */}
                    {isOverStock && (
                      <div className="sm:col-span-12 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 mt-0.5">
                        <AlertCircle size={13} />
                        Store stock insufficient: Only {row.available_stock} {row.unit_of_measurement} currently available.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Payment Modes & Financial Valuation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Mode Selector */}
            <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ReceiptText size={13} className="text-blue-500" />
                Payment Collection (Counter)
              </span>

              {/* Payment Methods buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Cash', label: 'Cash', icon: <Banknote size={14} /> },
                  { id: 'Card', label: 'Card / POS', icon: <CreditCard size={14} /> },
                  { id: 'UPI', label: 'UPI / QR', icon: <Smartphone size={14} /> },
                  { id: 'Bank Transfer', label: 'Transfer', icon: <ReceiptText size={14} /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                      paymentMethod === m.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* If Cash: Calculator for Cash Tendered & Change */}
              {paymentMethod === 'Cash' && (
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Cash Tendered:
                    </label>
                    <div className="relative w-36">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        placeholder="0.00"
                        className="input-base text-right font-mono text-xs pl-6 py-1"
                      />
                    </div>
                  </div>
                  {tenderedNum > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60 font-semibold">
                      <span className="text-slate-500">Change to Return:</span>
                      <span className={`font-mono tabular-nums ${tenderedNum >= grandTotal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        ₹{changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="form-label">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="select-base text-xs"
                  >
                    <option value="Paid">Paid in Full</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid / On Account</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Internal Sale Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Counter #1, Bag provided"
                    className="input-base text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Billing Calculation Summary */}
            <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Percent size={13} className="text-emerald-500" />
                Sale Bill Summary
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Cart Items Subtotal:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">GST / Tax Rate:</span>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="select-base w-36 py-1 text-xs"
                  >
                    <option value={0}>0% (Zero Tax)</option>
                    <option value={0.05}>5% GST</option>
                    <option value={0.12}>12% GST</option>
                    <option value={0.18}>18% GST (Standard)</option>
                    <option value={0.28}>28% GST</option>
                  </select>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tax Amount:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                    +₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Special Discount:</span>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="input-base w-full py-1 text-right font-mono text-xs pl-6"
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700/80 flex justify-between items-center text-xs font-bold text-slate-900 dark:text-slate-100">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500">Amount to Collect:</span>
                    <span className="block text-[11px] text-slate-400 font-normal">Immediate stock deduction</span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 text-lg font-mono font-bold tabular-nums">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || hasInsufficientStock}
              className="btn-primary flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Counter Sale...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Complete Walk-in Sale</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
