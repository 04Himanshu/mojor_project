import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Supplier, PurchaseOrderCreatePayload } from '../../types/procurement';
import type { InventoryItem } from '../../types/inventory';
import { inventoryApi } from '../../services/inventoryApi';
import { X, FileText, Plus, Trash2, Package, AlertCircle } from 'lucide-react';

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
          setError('Failed to load catalog items. Please check your connection.');
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

  // Lock background scroll and listen for Escape key
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
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-auto flex flex-col modal-content-animate"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Create Inbound Purchase Order
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Replenish warehouse inventory, negotiate unit costs, and schedule delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">
                Select Vendor / Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => handleSupplierChange(Number(e.target.value))}
                className="select-base font-medium"
              >
                <option value="" disabled>-- Select a qualified vendor --</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} ({sup.payment_terms} • Rating: {sup.rating}★)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="select-base"
              >
                <option value="Issued">Issued / Sent to Supplier</option>
                <option value="Draft">Save as Draft</option>
              </select>
            </div>
          </div>

          {/* Delivery & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label className="form-label">
                Payment Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30, Advance"
                className="input-base"
              />
            </div>
          </div>

          {/* Multi-item Line Editor */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Package size={14} className="text-blue-500" />
                Line Items to Purchase
              </span>
              <button
                type="button"
                onClick={addLineItem}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
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
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center gap-3"
                  >
                    {/* Item dropdown */}
                    <div className="flex-1 w-full">
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">
                        SKU & Description
                      </label>
                      <select
                        value={line.inventory_id}
                        onChange={(e) => handleItemSelect(index, Number(e.target.value))}
                        className="select-base text-xs py-1.5"
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
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">
                        Qty ({selectedInv?.unit_of_measurement || 'pcs'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity_ordered}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                        className="input-base text-xs py-1.5 font-mono font-semibold"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="w-full sm:w-32">
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">
                        Unit Cost (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_cost}
                        onChange={(e) => handleCostChange(index, parseFloat(e.target.value) || 0)}
                        className="input-base text-xs py-1.5 font-mono font-semibold"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="w-full sm:w-28 text-right pr-2">
                      <span className="text-[10px] font-medium text-slate-500 mb-1 block">
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
                      className="btn-ghost p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg"
                      title="Remove line item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Address & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Destination Warehouse / Receiving Dock
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="e.g. Main Central Warehouse, Dock 4"
                className="input-base"
              />
            </div>
            <div>
              <label className="form-label">
                PO Notes / Special Instructions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Include Certificate of Analysis with shipment"
                className="input-base"
              />
            </div>
          </div>

          {/* Financial Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">GST Rate</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                  className="select-base text-xs py-1.5"
                >
                  <option value={0}>0% (Tax Exempt)</option>
                  <option value={0.05}>5% GST</option>
                  <option value={0.12}>12% GST</option>
                  <option value={0.18}>18% GST (Standard)</option>
                  <option value={0.28}>28% GST</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Freight / Shipping (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="input-base text-xs py-1.5 font-mono w-28"
                />
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <div className="text-xs text-slate-500">
                Subtotal: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                {' '}+ Tax: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="text-base font-mono font-bold text-blue-600 dark:text-blue-400">
                Total: ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Order...</span>
                </>
              ) : (
                <span>Generate Purchase Order</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
