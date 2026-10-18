import React from 'react';
import type { InventoryItem, StockStatus, TransactionType } from '../../types/inventory';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  History, 
  ArrowRightLeft, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Ban, 
  Trash2,
  Search,
  AlertCircle
} from 'lucide-react';

interface Props {
  items: InventoryItem[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  categories: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onOpenTransaction: (item: InventoryItem, tab: TransactionType) => void;
  onViewHistory: (item: InventoryItem) => void;
}

const STATUS_TABS = [
  { id: 'ALL', label: 'All Items' },
  { id: 'IN_STOCK', label: 'In Stock' },
  { id: 'LOW_STOCK', label: 'Low Stock' },
  { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { id: 'INACTIVE', label: 'Inactive' },
];

export const InventoryTable: React.FC<Props> = ({
  items,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  sortBy,
  sortOrder,
  onSort,
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onEditItem,
  onDeleteItem,
  onOpenTransaction,
  onViewHistory,
}) => {
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown size={12} className="text-slate-400/60 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
    ) : (
      <ArrowDown size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
    );
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'In Stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
            <CheckCircle2 size={12} />
            In Stock
          </span>
        );
      case 'Low Stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
            <AlertTriangle size={12} />
            Low Stock
          </span>
        );
      case 'Out of Stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
            <AlertOctagon size={12} />
            Out of Stock
          </span>
        );
      case 'Inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Ban size={12} />
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
      {/* Header controls & filter tabs matching OrdersTable */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter.toUpperCase() === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onStatusFilterChange(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by product name, SKU, or category..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              aria-label="Filter items by category"
              className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Category: All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800 select-none">
            <tr>
              <th
                onClick={() => onSort('sku')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5 group">
                  <span>SKU</span>
                  {renderSortIcon('sku')}
                </div>
              </th>

              <th
                onClick={() => onSort('name')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5 group">
                  <span>Product Name</span>
                  {renderSortIcon('name')}
                </div>
              </th>

              <th
                onClick={() => onSort('quantity')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1.5 group">
                  <span>Stock Qty</span>
                  {renderSortIcon('quantity')}
                </div>
              </th>

              <th
                onClick={() => onSort('unit_price')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1.5 group">
                  <span>Unit Price</span>
                  {renderSortIcon('unit_price')}
                </div>
              </th>

              <th
                onClick={() => onSort('stock_value')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1.5 group">
                  <span>Stock Value</span>
                  {renderSortIcon('stock_value')}
                </div>
              </th>

              <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading inventory items...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <AlertCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No inventory items found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or add a new stock item.</p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* SKU */}
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {item.sku}
                  </td>

                  {/* Name & Category */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.category}
                      </span>
                      {item.description && (
                        <span className="text-[11px] text-slate-400 truncate max-w-xs">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Stock Quantity */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                      {item.quantity.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.unit_of_measurement} (Reorder at {item.reorder_level})
                    </div>
                  </td>

                  {/* Unit Price */}
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    ₹{item.selling_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Stock Value */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    ₹{item.stock_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Stock Movement In/Out */}
                      <button
                        onClick={() => onOpenTransaction(item, 'STOCK_IN')}
                        title="Stock In / Stock Out"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <ArrowRightLeft size={15} />
                      </button>

                      {/* Movement History */}
                      <button
                        onClick={() => onViewHistory(item)}
                        title="Movement Audit Trail"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <History size={15} />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => onEditItem(item)}
                        title="Edit Item"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteItem(item)}
                        title="Delete / Deactivate Item"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{items.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.min(page * pageSize, totalItems)}</span> of{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{totalItems}</span> items
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Previous
          </button>

          <span className="font-medium px-1">
            Page {page} of {totalPages || 1}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
