import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { InventoryItem, CreateItemPayload, UpdateItemPayload } from '../../types/inventory';
import { X, Sparkles, AlertCircle, Package } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateItemPayload | UpdateItemPayload, isEdit: boolean, id?: number) => Promise<void>;
  itemToEdit: InventoryItem | null;
  existingCategories: string[];
}

export const ItemModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
  existingCategories,
}) => {
  const isEdit = !!itemToEdit;

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [customCategory, setCustomCategory] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('pcs');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(5);
  const [initialQuantity, setInitialQuantity] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setSku(itemToEdit.sku);
      setName(itemToEdit.name);
      setDescription(itemToEdit.description || '');
      setCategory(itemToEdit.category || 'General');
      setCustomCategory('');
      setUnitOfMeasurement(itemToEdit.unit_of_measurement || 'pcs');
      setCostPrice(itemToEdit.cost_price);
      setSellingPrice(itemToEdit.selling_price);
      setReorderLevel(itemToEdit.reorder_level);
      setInitialQuantity(itemToEdit.quantity);
      setIsActive(itemToEdit.is_active);
    } else {
      setSku('');
      setName('');
      setDescription('');
      setCategory(existingCategories[0] || 'Electronics');
      setCustomCategory('');
      setUnitOfMeasurement('pcs');
      setCostPrice(0);
      setSellingPrice(0);
      setReorderLevel(5);
      setInitialQuantity(0);
      setIsActive(true);
    }
    setError(null);
  }, [itemToEdit, isOpen, existingCategories]);

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

  const handleGenerateSku = () => {
    const prefix = (name ? name.slice(0, 3).toUpperCase() : 'SKU');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setSku(`${prefix}-${randomNum}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCategory = category === 'CUSTOM' ? customCategory.trim() : category;

    if (!isEdit && !sku.trim()) {
      setError('SKU code is required.');
      return;
    }
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!finalCategory) {
      setError('Please select or specify a category.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && itemToEdit) {
        const updatePayload: UpdateItemPayload = {
          name: name.trim(),
          description: description.trim() || undefined,
          category: finalCategory,
          unit_of_measurement: unitOfMeasurement.trim(),
          cost_price: Number(costPrice),
          selling_price: Number(sellingPrice),
          reorder_level: Number(reorderLevel),
          is_active: isActive,
        };
        await onSave(updatePayload, true, itemToEdit.id);
      } else {
        const createPayload: CreateItemPayload = {
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          category: finalCategory,
          unit_of_measurement: unitOfMeasurement.trim(),
          cost_price: Number(costPrice),
          selling_price: Number(sellingPrice),
          reorder_level: Number(reorderLevel),
          initial_quantity: Number(initialQuantity),
          is_active: isActive,
        };
        await onSave(createPayload, false);
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save inventory item';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const commonUnits = ['pcs', 'units', 'box', 'pack', 'kg', 'g', 'bundle', 'reams', 'litres', 'm'];

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
        className="bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/40 flex flex-col modal-content-animate my-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 sticky top-0 bg-white/95 dark:bg-[#101726]/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {isEdit ? 'Edit Inventory Item' : 'Register New Inventory Item'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isEdit ? `Updating ${itemToEdit?.sku}` : 'Fill in specifications for the new stock item'}
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
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {/* Row 1: SKU & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  SKU Code <span className="text-rose-500">*</span>
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Sparkles size={11} /> Auto-generate
                  </button>
                )}
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                disabled={isEdit}
                placeholder="e.g. ELEC-001"
                className={`input-base font-mono ${
                  isEdit ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="form-label">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wireless Ergonomic Mouse"
                className="input-base"
                required
              />
            </div>
          </div>

          {/* Row 2: Category & Unit of Measurement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select-base"
              >
                {existingCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                {!existingCategories.includes('Electronics') && <option value="Electronics">Electronics</option>}
                {!existingCategories.includes('Furniture') && <option value="Furniture">Furniture</option>}
                {!existingCategories.includes('Stationery') && <option value="Stationery">Stationery</option>}
                {!existingCategories.includes('Packaging') && <option value="Packaging">Packaging</option>}
                <option value="CUSTOM">+ Add New Category...</option>
              </select>

              {category === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Enter custom category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="input-base mt-2 border-blue-400"
                  required
                />
              )}
            </div>

            <div>
              <label className="form-label">
                Unit of Measurement (UOM)
              </label>
              <input
                type="text"
                value={unitOfMeasurement}
                onChange={(e) => setUnitOfMeasurement(e.target.value)}
                placeholder="e.g. pcs, kg, box"
                className="input-base"
                required
              />
              <div className="flex gap-1.5 flex-wrap mt-2">
                {commonUnits.slice(0, 6).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnitOfMeasurement(u)}
                    className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed specifications, storage requirements or notes..."
              className="input-base py-2.5 resize-none"
            />
          </div>

          {/* Pricing: Cost Price & Selling Price */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pricing & Valuation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Cost Price (₹) <span className="text-slate-400 font-normal lowercase">stock valuation</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="input-base pl-8 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Selling Price / Unit Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="input-base pl-8 font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stock Levels & Reorder Configuration */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Inventory Quantities & Alert Threshold
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isEdit ? (
                <div>
                  <label className="form-label">
                    Initial Quantity on Hand
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
                    className="input-base font-mono"
                  />
                  <p className="form-hint">
                    Will log an initial Stock In entry automatically.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="form-label">
                    Current Quantity
                  </label>
                  <div className="px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono border border-slate-200/60 dark:border-slate-700">
                    {itemToEdit?.quantity} {itemToEdit?.unit_of_measurement}
                  </div>
                  <p className="form-hint">
                    Modify quantity via Stock In, Stock Out, or Physical Adjustment.
                  </p>
                </div>
              )}

              <div>
                <label className="form-label">
                  Reorder Level (Alert Threshold)
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                  className="input-base font-mono"
                  required
                />
                <p className="form-hint">
                  Triggers "Low Stock" alert when quantity ≤ threshold.
                </p>
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Item Status
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Active items are visible in operations and catalog searches.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Footer buttons */}
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
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
