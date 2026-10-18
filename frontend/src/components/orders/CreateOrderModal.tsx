import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Customer, OrderCreatePayload } from '../../types/order';
import type { InventoryItem } from '../../types/inventory';
import { inventoryApi } from '../../services/inventoryApi';
import { orderApi } from '../../services/orderApi';
import { 
  X, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Building2, 
  ShoppingCart,
  Percent,
  ReceiptText
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  // Payment & Financial state
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [taxRate, setTaxRate] = useState(0.18);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // Item rows
  const [itemRows, setItemRows] = useState<ItemRow[]>([
    {
      inventory_id: 0,
      quantity: 1,
      unit_price: 0,
      available_stock: 0,
      item_name: '',
      item_sku: '',
      unit_of_measurement: 'units'
    }
  ]);

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

  // Load available customers and inventory items on modal open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      Promise.all([
        orderApi.getCustomers(),
        inventoryApi.getItems({ page_size: 100 })
      ])
        .then(([custData, invData]) => {
          setCustomers(custData);
          setInventoryList(invData.items.filter((i) => i.is_active));
          if (custData.length > 0 && !isWalkIn) {
            handleCustomerSelect(custData[0].id, custData);
          }
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load registered customers or warehouse inventory items.');
        });
    }
  }, [isOpen]);

  const handleCustomerSelect = (custId: number, custList: Customer[] = customers) => {
    setSelectedCustomerId(custId);
    const found = custList.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerEmail(found.email);
      setCustomerPhone(found.phone);
      setShippingAddress(found.address || '');
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
      unit_of_measurement: itm.unit_of_measurement
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
        unit_of_measurement: 'units'
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (itemRows.length <= 1) return;
    setItemRows(itemRows.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = itemRows.reduce((acc, row) => {
    if (row.inventory_id > 0) {
      return acc + row.quantity * row.unit_price;
    }
    return acc;
  }, 0);

  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const grandTotal = Math.max(0, Math.round((subtotal + taxAmount - discountAmount) * 100) / 100);

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
      setError('Please select at least one valid inventory item.');
      return;
    }

    if (hasDuplicateItems()) {
      setError('Duplicate items detected in order lines. Please merge them into a single line.');
      return;
    }

    if (hasInsufficientStock) {
      setError('Some order quantities exceed currently available stock in warehouse.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: OrderCreatePayload = {
        customer_id: isWalkIn ? undefined : (selectedCustomerId as number) || undefined,
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        shipping_address: shippingAddress.trim() || undefined,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        tax_rate: taxRate,
        discount_amount: Number(discountAmount) || 0,
        notes: notes.trim() || undefined,
        items: validItems.map((r) => ({
          inventory_id: r.inventory_id,
          quantity: r.quantity
        }))
      };

      await orderApi.createOrder(payload);
      showNotification('New sales order created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to place sales order';
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50 ring-1 ring-black/5 dark:ring-white/10 flex flex-col modal-content-animate my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching ItemModal */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Create Sales Order
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add multiple items with live stock verification and auto tax calculation
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Customer Selection Card */}
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-500" />
                Customer & Delivery Information
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsWalkIn(!isWalkIn);
                  if (!isWalkIn) {
                    setSelectedCustomerId('');
                    setCustomerName('');
                    setCustomerEmail('');
                    setCustomerPhone('');
                    setShippingAddress('');
                  }
                }}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                {isWalkIn ? '← Select Registered Customer' : '+ New / Walk-in Customer'}
              </button>
            </div>

            {!isWalkIn ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    placeholder="Acme Inc. / John Doe"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="billing@example.com"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Shipping / Delivery Address
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Suite 500, Industrial Area, Sector 62..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Line Items Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart size={14} className="text-blue-500" />
                Line Items
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-900/60 transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
                Add Another Item
              </button>
            </div>

            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {itemRows.map((row, idx) => {
                const isOverStock = row.inventory_id > 0 && row.quantity > row.available_stock;
                const lineSubtotal = row.quantity * row.unit_price;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center ${
                      isOverStock ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    {/* Item Selector */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Select Product
                      </label>
                      <select
                        value={row.inventory_id}
                        onChange={(e) => handleItemSelect(idx, Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      >
                        <option value={0}>-- Select Product --</option>
                        {inventoryList.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.sku}) - Available: {inv.quantity} {inv.unit_of_measurement}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Quantity ({row.unit_of_measurement})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                        disabled={row.inventory_id === 0}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Price
                      </label>
                      <div className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold font-mono">
                        ₹{row.unit_price.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="sm:col-span-2 text-right">
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Subtotal
                      </label>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono pt-1">
                        ₹{lineSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Remove Action */}
                    <div className="sm:col-span-1 text-right pt-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={itemRows.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Stock Alert Warning if Over Stock */}
                    {isOverStock && (
                      <div className="sm:col-span-12 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 mt-1">
                        <AlertCircle size={13} />
                        Only {row.available_stock} {row.unit_of_measurement} available in warehouse.
                        Please reduce quantity to proceed.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment & Financial Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Details */}
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ReceiptText size={14} className="text-blue-500" />
                Payment & Notes
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid in Full</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card / POS</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Credit Net 30">Credit Net 30</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Order Notes / Dispatch Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional delivery instructions or PO reference..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Percent size={14} className="text-emerald-500" />
                Valuation Summary
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Applicable GST:</span>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value={0}>0% (Zero Tax)</option>
                    <option value={0.05}>5% GST</option>
                    <option value={0.12}>12% GST</option>
                    <option value={0.18}>18% Standard GST</option>
                    <option value={0.28}>28% High GST</option>
                  </select>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tax Amount:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    +₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Discount:</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-24 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-slate-100">
                  <span>Grand Total:</span>
                  <span className="text-blue-600 dark:text-blue-400 text-base font-mono font-bold">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer matching ItemModal */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || hasInsufficientStock}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Order...
                </>
              ) : (
                'Place Sales Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
