import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PurchaseOrder, GoodsReceiptCreatePayload } from '../../types/procurement';
import { X, PackageCheck, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GoodsReceiptCreatePayload) => Promise<void>;
  purchaseOrder: PurchaseOrder | null;
}

interface InwardItemState {
  purchase_order_item_id: number;
  item_name: string;
  item_sku: string;
  unit_of_measurement: string;
  quantity_ordered: number;
  quantity_received: number;
  pending_quantity: number;
  quantity_to_receive: number;
  batch_lot_number: string;
  condition_notes: string;
}

export const ReceiveGoodsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  purchaseOrder
}) => {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveryChallanNumber, setDeliveryChallanNumber] = useState('');
  const [receivedBy, setReceivedBy] = useState('Admin User');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InwardItemState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      setCarrier('Blue Dart Logistics');
      setTrackingNumber('');
      setDeliveryChallanNumber('');
      setReceivedBy('Admin User');
      setNotes('');
      setError(null);

      // Prepopulate line items with pending quantities
      const initialItems: InwardItemState[] = purchaseOrder.items.map((it) => {
        const pending = Math.max(0, it.quantity_ordered - it.quantity_received);
        return {
          purchase_order_item_id: it.id,
          item_name: it.item_name || 'Item',
          item_sku: it.item_sku || 'SKU',
          unit_of_measurement: it.unit_of_measurement || 'pcs',
          quantity_ordered: it.quantity_ordered,
          quantity_received: it.quantity_received,
          pending_quantity: pending,
          quantity_to_receive: pending, // Defaults to remaining pending quantity
          batch_lot_number: '',
          condition_notes: 'Good Condition'
        };
      });
      setItems(initialItems);
    }
  }, [purchaseOrder, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !purchaseOrder) return null;

  const handleQtyChange = (index: number, val: number) => {
    const updated = [...items];
    const maxAllowed = updated[index].pending_quantity;
    updated[index].quantity_to_receive = Math.min(Math.max(0, val), maxAllowed);
    setItems(updated);
  };

  const handleBatchChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index].batch_lot_number = val;
    setItems(updated);
  };

  const totalInwardUnits = items.reduce((sum, i) => sum + (i.quantity_to_receive || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalInwardUnits <= 0) {
      setError('Please enter a quantity greater than 0 for at least one item to inward.');
      return;
    }

    const itemsToSubmit = items
      .filter((i) => i.quantity_to_receive > 0)
      .map((i) => ({
        purchase_order_item_id: i.purchase_order_item_id,
        quantity_received: i.quantity_to_receive,
        batch_lot_number: i.batch_lot_number.trim() || undefined,
        condition_notes: i.condition_notes || 'Good Condition'
      }));

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        purchase_order_id: purchaseOrder.id,
        received_by: receivedBy.trim() || 'Admin User',
        carrier: carrier.trim() || undefined,
        tracking_number: trackingNumber.trim() || undefined,
        delivery_challan_number: deliveryChallanNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        items: itemsToSubmit
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to record goods receipt.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <PackageCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Goods Received Note (GRN) Inward
                </h2>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">
                  {purchaseOrder.po_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supplier: <span className="font-semibold text-slate-700 dark:text-slate-300">{purchaseOrder.supplier_name}</span>
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

          {/* Shipment & Inward Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Logistics Carrier / Transporter
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. Blue Dart, FedEx, Direct"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. BD-88223311"
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Delivery Challan (DC) / Bill #
              </label>
              <input
                type="text"
                value={deliveryChallanNumber}
                onChange={(e) => setDeliveryChallanNumber(e.target.value)}
                placeholder="e.g. DC-2026-99"
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Items Inward Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Items to Inward & Inspect</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
                Total Inward: +{totalInwardUnits} units
              </span>
            </span>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, idx) => (
                <div
                  key={item.purchase_order_item_id}
                  className="p-3.5 bg-slate-50/40 dark:bg-slate-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  {/* Item Description */}
                  <div className="flex-1">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {item.item_name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      SKU: <span className="font-mono">{item.item_sku}</span> • Ordered: {item.quantity_ordered} • Previously Inwarded: {item.quantity_received}
                    </div>
                  </div>

                  {/* Batch & Inward Qty Controls */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Batch / Lot #
                      </label>
                      <input
                        type="text"
                        value={item.batch_lot_number}
                        onChange={(e) => handleBatchChange(idx, e.target.value)}
                        placeholder="LOT-A1"
                        className="w-24 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Remaining Pending
                      </label>
                      <span className="block px-2.5 py-1 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                        {item.pending_quantity}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                        Inward Now
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.pending_quantity}
                        value={item.quantity_to_receive}
                        onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-lg text-center"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automatic Integration Notice */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Real-time Warehouse Automation:</span>
              <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                Confirming this Goods Receipt will immediately increment physical stock counts in Inventory, record an official <strong>STOCK_IN</strong> movement entry in audit history, and update the inventory cost price to this order's purchase price.
              </p>
            </div>
          </div>

          {/* Quality Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quality Inspection & Receiving Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. All cartons intact, seal verified, passed visual quality check"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
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
              disabled={loading || totalInwardUnits <= 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Inwarding Stock...' : `Confirm Stock Inward (+${totalInwardUnits} Units)`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
