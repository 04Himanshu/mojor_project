import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { 
  InventoryItem, 
  StockInPayload, 
  StockOutPayload, 
  StockAdjustmentPayload, 
  TransactionType 
} from '../../types/inventory';
import { X, ArrowDownRight, ArrowUpRight, SlidersHorizontal, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  allItems?: InventoryItem[];
  defaultTab?: TransactionType;
  onTransactionSuccess: () => void;
  onStockIn: (id: number, payload: StockInPayload) => Promise<any>;
  onStockOut: (id: number, payload: StockOutPayload) => Promise<any>;
  onStockAdjustment: (id: number, payload: StockAdjustmentPayload) => Promise<any>;
}

export const StockTransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item: initialItem,
  allItems = [],
  defaultTab = 'STOCK_IN',
  onTransactionSuccess,
  onStockIn,
  onStockOut,
  onStockAdjustment,
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>(defaultTab);
  const [selectedItemId, setSelectedItemId] = useState<number>(initialItem?.id || 0);
  
  // Transaction Fields
  const [quantity, setQuantity] = useState<number>(1);
  const [newQuantity, setNewQuantity] = useState<number>(initialItem?.quantity || 0);
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [referenceOrder, setReferenceOrder] = useState<string>('');
  const [userName, setUserName] = useState<string>('Admin User');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItem) {
      setSelectedItemId(initialItem.id);
      setNewQuantity(initialItem.quantity);
    } else if (allItems.length > 0 && selectedItemId === 0) {
      setSelectedItemId(allItems[0].id);
      setNewQuantity(allItems[0].quantity);
    }
  }, [initialItem, allItems]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const currentItem = initialItem?.id === selectedItemId
    ? initialItem
    : allItems.find((i) => i.id === selectedItemId) || initialItem;

  useEffect(() => {
    if (currentItem) {
      setNewQuantity(currentItem.quantity);
    }
    // Set default reason based on active tab
    if (activeTab === 'STOCK_IN') {
      setReason('Supplier Delivery Received');
    } else if (activeTab === 'STOCK_OUT') {
      setReason('Customer Dispatch Order');
    } else {
      setReason('Periodic Physical Count Audit');
    }
    setError(null);
  }, [activeTab, currentItem]);

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

  if (!isOpen) return null;

  const currentStock = currentItem?.quantity ?? 0;
  const isStockOutExceeded = activeTab === 'STOCK_OUT' && quantity > currentStock;

  const stockInReasons = [
    'Supplier Delivery Received',
    'Customer Return Restock',
    'Warehouse Transfer Inward',
    'Physical Found Stock',
    'Production Output Received',
    'CUSTOM'
  ];

  const stockOutReasons = [
    'Customer Dispatch Order',
    'Damaged / Expired Goods Write-off',
    'Internal Company Consumption',
    'Scrap & Defective Removal',
    'Return to Vendor',
    'CUSTOM'
  ];

  const adjustmentReasons = [
    'Periodic Physical Count Audit',
    'Stock Discrepancy Correction',
    'Inventory Loss Adjustment',
    'Damaged Items Reclassification',
    'CUSTOM'
  ];

  const reasonsList = activeTab === 'STOCK_IN'
    ? stockInReasons
    : activeTab === 'STOCK_OUT'
    ? stockOutReasons
    : adjustmentReasons;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) {
      setError('Please select an inventory item.');
      return;
    }

    const finalReason = reason === 'CUSTOM' ? customReason.trim() : reason;
    if (!finalReason) {
      setError('Please provide a reason for this inventory movement.');
      return;
    }

    // Client-side negative stock check
    if (activeTab === 'STOCK_OUT') {
      if (quantity <= 0) {
        setError('Quantity must be greater than 0.');
        return;
      }
      if (quantity > currentItem.quantity) {
        setError(`Insufficient stock. Current available quantity is only ${currentItem.quantity} ${currentItem.unit_of_measurement}. Stock cannot become negative.`);
        return;
      }
    } else if (activeTab === 'STOCK_IN') {
      if (quantity <= 0) {
        setError('Quantity must be greater than 0.');
        return;
      }
    } else if (activeTab === 'ADJUSTMENT') {
      if (newQuantity < 0) {
        setError('Adjusted quantity cannot be negative.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'STOCK_IN') {
        await onStockIn(currentItem.id, {
          quantity: Number(quantity),
          reason: finalReason,
          reference_order: referenceOrder.trim() || undefined,
          user_name: userName.trim() || 'Admin User',
        });
      } else if (activeTab === 'STOCK_OUT') {
        await onStockOut(currentItem.id, {
          quantity: Number(quantity),
          reason: finalReason,
          reference_order: referenceOrder.trim() || undefined,
          user_name: userName.trim() || 'Admin User',
        });
      } else {
        await onStockAdjustment(currentItem.id, {
          new_quantity: Number(newQuantity),
          reason: finalReason,
          reference_order: referenceOrder.trim() || undefined,
          user_name: userName.trim() || 'Admin User',
        });
      }

      onTransactionSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Transaction failed';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const resultingStock = () => {
    if (!currentItem) return 0;
    if (activeTab === 'STOCK_IN') return currentItem.quantity + Number(quantity || 0);
    if (activeTab === 'STOCK_OUT') return Math.max(0, currentItem.quantity - Number(quantity || 0));
    return Number(newQuantity || 0);
  };

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 dark:bg-black/75 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl shadow-black/40 flex flex-col modal-content-animate my-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 sticky top-0 bg-white/95 dark:bg-[#101726]/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              activeTab === 'STOCK_IN' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : activeTab === 'STOCK_OUT'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
            }`}>
              {activeTab === 'STOCK_IN' ? <ArrowDownRight size={18} /> : activeTab === 'STOCK_OUT' ? <ArrowUpRight size={18} /> : <SlidersHorizontal size={18} />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Stock Movement
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Log inbound, outbound or physical adjustment transactions
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

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-900/60 mx-6 mt-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('STOCK_IN')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === 'STOCK_IN'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownRight size={14} />
            Stock In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STOCK_OUT')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === 'STOCK_OUT'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowUpRight size={14} />
            Stock Out
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ADJUSTMENT')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === 'ADJUSTMENT'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal size={14} />
            Adjustment
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {/* Target Item Selector */}
          <div>
            <label className="form-label">
              Select Item
            </label>
            {allItems.length > 0 && !initialItem ? (
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(Number(e.target.value))}
                className="select-base"
              >
                {allItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.sku}] {i.name} (Current: {i.quantity} {i.unit_of_measurement})
                  </option>
                ))}
              </select>
            ) : currentItem ? (
              <div className="p-3 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 rounded-md font-bold">
                      {currentItem.sku}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {currentItem.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Category: {currentItem.category} · Unit: {currentItem.unit_of_measurement}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                    Current Stock
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {currentItem.quantity}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Quantities & Preview calculation */}
          {activeTab === 'ADJUSTMENT' ? (
            <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Physical Inventory Count
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">System Count</span>
                  <div className="px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 font-mono">
                    {currentStock} {currentItem?.unit_of_measurement}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    New Counted Quantity
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                    className="input-base font-mono font-bold"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-blue-200/60 dark:border-blue-900/40">
                <span className="text-slate-600 dark:text-slate-400">Adjustment Delta:</span>
                <span className={`font-mono font-bold ${newQuantity - currentStock >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {newQuantity - currentStock >= 0 ? `+${newQuantity - currentStock}` : newQuantity - currentStock} {currentItem?.unit_of_measurement}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    {activeTab === 'STOCK_IN' ? 'Quantity to Add' : 'Quantity to Remove'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className={`input-base font-mono font-bold ${
                      isStockOutExceeded
                        ? 'border-rose-500 ring-2 ring-rose-400/30'
                        : ''
                    }`}
                    required
                  />
                  {isStockOutExceeded && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                      Exceeds available stock ({currentStock})!
                    </p>
                  )}
                </div>

                <div>
                  <span className="form-label text-slate-500">
                    Resulting Stock
                  </span>
                  <div className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 font-mono">
                    {resultingStock()} {currentItem?.unit_of_measurement}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {activeTab === 'STOCK_IN' ? `+${quantity} will be added` : `-${quantity} will be deducted`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="form-label">
              Reason for Movement <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="select-base"
            >
              {reasonsList.map((r) => (
                <option key={r} value={r}>
                  {r === 'CUSTOM' ? '+ Custom Reason...' : r}
                </option>
              ))}
            </select>

            {reason === 'CUSTOM' && (
              <input
                type="text"
                placeholder="Enter specific custom reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="input-base mt-2 border-blue-400"
                required
              />
            )}
          </div>

          {/* Reference Order & User */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Reference Order / PO / SO (Optional)
              </label>
              <input
                type="text"
                value={referenceOrder}
                onChange={(e) => setReferenceOrder(e.target.value)}
                placeholder="e.g. PO-1024 or SO-501"
                className="input-base font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Authorized By / User
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="User name"
                className="input-base"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isStockOutExceeded}
              className={`btn-base px-4 py-2 text-white ${
                isStockOutExceeded
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : activeTab === 'STOCK_IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20'
                  : activeTab === 'STOCK_OUT'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20'
              }`}
            >
              {loading ? (
                'Processing...'
              ) : activeTab === 'STOCK_IN' ? (
                <>
                  <CheckCircle2 size={15} /> Confirm Stock In
                </>
              ) : activeTab === 'STOCK_OUT' ? (
                <>
                  <ArrowUpRight size={15} /> Confirm Stock Out
                </>
              ) : (
                <>
                  <SlidersHorizontal size={15} /> Apply Adjustment
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
