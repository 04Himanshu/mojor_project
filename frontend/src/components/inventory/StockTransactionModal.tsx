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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl shadow-black/50 ring-1 ring-black/5 dark:ring-white/10 flex flex-col modal-content-animate my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Stock Movement Transaction
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record inventory changes with automatic movement tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-100 dark:bg-slate-800/60 mx-6 mt-4 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('STOCK_IN')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'STOCK_IN'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ArrowDownRight size={15} />
            Stock In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STOCK_OUT')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'STOCK_OUT'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ArrowUpRight size={15} />
            Stock Out
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ADJUSTMENT')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ADJUSTMENT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <SlidersHorizontal size={15} />
            Adjustment
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {/* Target Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Item
            </label>
            {allItems.length > 0 && !initialItem ? (
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {allItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.sku}] {i.name} (Current: {i.quantity} {i.unit_of_measurement})
                  </option>
                ))}
              </select>
            ) : currentItem ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-semibold">
                      {currentItem.sku}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {currentItem.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Category: {currentItem.category} · Unit: {currentItem.unit_of_measurement}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                    Current Stock
                  </span>
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                    {currentItem.quantity}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Quantities & Preview calculation */}
          {activeTab === 'ADJUSTMENT' ? (
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Physical Inventory Count
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">System Count</span>
                  <div className="px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-mono">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-blue-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {activeTab === 'STOCK_IN' ? 'Quantity to Add' : 'Quantity to Remove'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      isStockOutExceeded
                        ? 'border-red-500 ring-2 ring-red-400/30'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                  {isStockOutExceeded && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold">
                      Exceeds available stock ({currentStock})!
                    </p>
                  )}
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Resulting Stock
                  </span>
                  <div className="px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono">
                    {resultingStock()} {currentItem?.unit_of_measurement}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {activeTab === 'STOCK_IN' ? `+${quantity} will be added` : `-${quantity} will be deducted`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Movement <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-blue-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
          </div>

          {/* Reference Order & User */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reference Order / PO / SO (Optional)
              </label>
              <input
                type="text"
                value={referenceOrder}
                onChange={(e) => setReferenceOrder(e.target.value)}
                placeholder="e.g. PO-1024 or SO-501"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Authorized By / User
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="User name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isStockOutExceeded}
              className={`px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 ${
                isStockOutExceeded
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : activeTab === 'STOCK_IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : activeTab === 'STOCK_OUT'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                'Processing...'
              ) : activeTab === 'STOCK_IN' ? (
                <>
                  <CheckCircle2 size={16} /> Confirm Stock In
                </>
              ) : activeTab === 'STOCK_OUT' ? (
                <>
                  <ArrowUpRight size={16} /> Confirm Stock Out
                </>
              ) : (
                <>
                  <SlidersHorizontal size={16} /> Apply Adjustment
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
