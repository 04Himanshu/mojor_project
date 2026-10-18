import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Supplier, PurchaseOrderCreatePayload } from '../../types/procurement';
import type { InventoryItem } from '../../types/inventory';
import { inventoryApi } from '../../services/inventoryApi';
import { X, FileText, Plus, Trash2, Package } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PurchaseOrderCreatePayload) => Promise<void>;
  suppliers: Supplier[];
  preselectedSupplierId?: number;
}

interface LineItem {
  inventory_id: number;
  quantity_ordered: number;
  unit_cost: number;
}

export const CreatePurchaseOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  preselectedSupplierId
}) => {
  const [supplierId, setSupplierId] = useState<number | ''>(preselectedSupplierId || '');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [status, setStatus] = useState('Issued');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [shippingAddress, setShippingAddress] = useState('Main Central Warehouse, Dock 4');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState<number>(0.18); // 18% GST default
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { inventory_id: 0, quantity_ordered: 10, unit_cost: 0 }
  ]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load live inventory
  useEffect(() => {
    if (isOpen) {
      inventoryApi.getItems({ page_size: 100 })
        .then((res) => {
          const activeItems = (res?.items || []).filter((i) => i.is_active);
          setInventoryList(activeItems);
          if (activeItems.length > 0) {
            setLineItems([
              {
                inventory_id: activeItems[0].id,
                quantity_ordered: 10,
                unit_cost: activeItems[0].cost_price || 100
              }
            ]);
          }
        })
        .catch((err) => {
          console.error('Failed to load inventory items', err);
          setError('Failed to load inventory items. Please check backend connection.');
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (preselectedSupplierId) {
        setSupplierId(preselectedSupplierId);
        const sup = suppliers.find((s) => s.id === preselectedSupplierId);
        if (sup) setPaymentTerms(sup.payment_terms || 'Net 30');
      } else if (suppliers.length > 0) {
        setSupplierId(suppliers[0].id);
        setPaymentTerms(suppliers[0].payment_terms || 'Net 30');
      }
    }
  }, [suppliers, preselectedSupplierId, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSupplierChange = (id: number) => {
    setSupplierId(id);
    const sup = suppliers.find((s) => s.id === id);
    if (sup) setPaymentTerms(sup.payment_terms || 'Net 30');
  };

  const handleItemSelect = (index: number, invId: number) => {
    const inv = inventoryList.find((i) => i.id === invId);
    const updated = [...lineItems];
    updated[index] = {
      inventory_id: invId,
      quantity_ordered: updated[index].quantity_ordered || 1,
      unit_cost: inv?.cost_price || 0
    };
    setLineItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...lineItems];
    updated[index].quantity_ordered = Math.max(1, qty);
    setLineItems(updated);
  };

  const handleCostChange = (index: number, cost: number) => {
    const updated = [...lineItems];
    updated[index].unit_cost = Math.max(0, cost);
    setLineItems(updated);
  };

  const addLineItem = () => {
    const usedIds = new Set(lineItems.map((i) => i.inventory_id));
    const nextItem = inventoryList.find((i) => !usedIds.has(i.id)) || inventoryList[0];
    if (nextItem) {
      setLineItems([
        ...lineItems,
        {
          inventory_id: nextItem.id,
          quantity_ordered: 10,
          unit_cost: nextItem.cost_price || 0
        }
      ]);
    }
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Compute live financial totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity_ordered * item.unit_cost, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const totalAmount = subtotal + taxAmount + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('Please select a supplier.');
      return;
    }
    if (!lineItems.length || lineItems.some((i) => !i.inventory_id || i.inventory_id <= 0)) {
      setError('Please select a valid item for all line rows.');
      return;
    }
    const itemIds = lineItems.map((i) => i.inventory_id);
    if (new Set(itemIds).size !== itemIds.length) {
      setError('Duplicate items selected. Please consolidate quantities into a single row.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        supplier_id: Number(supplierId),
        order_date: new Date().toISOString(),
        expected_delivery_date: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : undefined,
        status,
        payment_status: 'Unpaid',
        payment_terms: paymentTerms,
        notes: notes.trim() || undefined,
        shipping_address: shippingAddress.trim() || undefined,
        tax_rate: taxRate,
        shipping_cost: shippingCost,
        items: lineItems.map((item) => ({
          inventory_id: item.inventory_id,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost
        }))
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to create purchase order.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create Inbound Purchase Order (PO)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Replenish warehouse inventory, negotiate unit costs, and schedule delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Supplier & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Vendor / Supplier <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                >
                  <option value="" disabled>-- Select a qualified vendor --</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name} ({sup.payment_terms} • Rating: {sup.rating}★)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              >
                <option value="Issued">Issued / Sent to Supplier</option>
                <option value="Draft">Save as Draft</option>
              </select>
            </div>
          </div>

          {/* Delivery & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30, Advance"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Multi-item Line Editor */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Package size={14} className="text-blue-500" />
                Line Items to Purchase
              </span>
              <button
                type="button"
                onClick={addLineItem}
                className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 rounded-lg transition-colors flex items-center gap-1 border border-blue-200 dark:border-blue-800/60"
              >
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((line, index) => {
                const lineTotal = line.quantity_ordered * line.unit_cost;
                const selectedInv = inventoryList.find((i) => i.id === line.inventory_id);

                return (
                  <div
                    key={index}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center gap-3"
                  >
                    {/* Item dropdown */}
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        SKU & Description
                      </label>
                      <select
                        value={line.inventory_id}
                        onChange={(e) => handleItemSelect(index, Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      >
                        {inventoryList.map((item) => (
                          <option key={item.id} value={item.id}>
                            [{item.sku}] {item.name} (Stock: {item.quantity} {item.unit_of_measurement})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-full sm:w-28">
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Qty ({selectedInv?.unit_of_measurement || 'pcs'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity_ordered}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="w-full sm:w-32">
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Unit Purchase Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_cost}
                        onChange={(e) => handleCostChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="w-full sm:w-28 text-right pr-2">
                      <span className="block text-[10px] font-medium text-slate-500 mb-1">
                        Subtotal
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        ₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg transition-colors"
                      title="Remove line item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Address & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Destination Warehouse / Receiving Dock
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="e.g. Main Central Warehouse, Dock 4"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PO Notes / Special Instructions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Include Certificate of Analysis with shipment"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Financial Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tax / GST Rate</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value={0}>0% (Tax Exempt)</option>
                  <option value={0.05}>5% GST</option>
                  <option value={0.12}>12% GST</option>
                  <option value={0.18}>18% GST (Standard)</option>
                  <option value={0.28}>28% GST</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Freight / Shipping (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2.5 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <div className="text-xs text-slate-500">
                Subtotal: <span className="font-mono font-medium">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                {' '}+ Tax: <span className="font-mono font-medium">₹{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="text-lg font-mono font-extrabold text-blue-600 dark:text-blue-400">
                Total: ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Creating Order...' : 'Generate Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
