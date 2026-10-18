import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { InventoryItem, CreateItemPayload, UpdateItemPayload } from '../../types/inventory';
import { X, Sparkles, AlertCircle } from 'lucide-react';

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
      // Defaults for new item
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md modal-backdrop-animate overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50 ring-1 ring-black/5 dark:ring-white/10 flex flex-col modal-content-animate my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEdit ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit ? `Updating ${itemToEdit?.sku}` : 'Fill in the specifications for the new stock item'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {/* Row 1: SKU & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  SKU Code <span className="text-red-500">*</span>
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Auto-generate
                  </button>
                )}
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                disabled={isEdit}
                placeholder="e.g. ELEC-001"
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  isEdit
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wireless Ergonomic Mouse"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Row 2: Category & Unit of Measurement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-blue-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measurement (UOM)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unitOfMeasurement}
                  onChange={(e) => setUnitOfMeasurement(e.target.value)}
                  placeholder="e.g. pcs, kg, box"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {commonUnits.slice(0, 5).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnitOfMeasurement(u)}
                    className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed specifications, storage requirements or notes..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pricing: Cost Price & Selling Price */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pricing & Valuation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cost Price (₹) <span className="text-slate-400 font-normal">used for stock valuation</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selling Price / Unit Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stock Levels & Reorder Configuration */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Inventory Quantities & Alert Threshold
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isEdit ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Quantity on Hand
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Will log an initial Stock In entry automatically.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Quantity
                  </label>
                  <div className="px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono">
                    {itemToEdit?.quantity} {itemToEdit?.unit_of_measurement}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    To modify quantity, use Stock In, Stock Out, or Physical Adjustment.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reorder Level (Alert Threshold)
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Triggers "Low Stock" alert when quantity ≤ this level.
                </p>
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Item Status
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active items are visible in operations and stock calculations.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Footer buttons */}
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
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2"
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

