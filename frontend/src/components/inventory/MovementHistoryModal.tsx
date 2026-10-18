import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { StockMovement, InventoryItem, TransactionType } from '../../types/inventory';
import { inventoryApi } from '../../services/inventoryApi';
import { X, ArrowDownRight, ArrowUpRight, SlidersHorizontal, Search, RefreshCw, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

export const MovementHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      if (item) {
        const data = await inventoryApi.getItemMovements(item.id);
        setMovements(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else {
        const data = await inventoryApi.getAllMovements({
          search: search || undefined,
          transaction_type: typeFilter !== 'ALL' ? typeFilter : undefined,
          page,
          page_size: 15,
        });
        setMovements(data.movements);
        setTotalPages(data.total_pages);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error('Failed to load stock movements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMovements();
    }
  }, [isOpen, item, page, typeFilter]);

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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getBadge = (type: TransactionType) => {
    if (type === 'STOCK_IN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
          <ArrowDownRight size={13} /> Stock In
        </span>
      );
    }
    if (type === 'STOCK_OUT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400">
          <ArrowUpRight size={13} /> Stock Out
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400">
        <SlidersHorizontal size={13} /> Adjustment
      </span>
    );
  };

  const filteredMovements = item
    ? movements.filter((m) => {
        const matchesSearch =
          !search ||
          m.reason.toLowerCase().includes(search.toLowerCase()) ||
          (m.reference_order && m.reference_order.toLowerCase().includes(search.toLowerCase())) ||
          m.user_name.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'ALL' || m.transaction_type === typeFilter;
        return matchesSearch && matchesType;
      })
    : movements;

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
        className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-black/5 dark:ring-white/10 flex flex-col modal-content-animate my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {item ? `Stock Movement History: ${item.name}` : 'All Stock Movement History'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item ? `SKU: ${item.sku} · Current Stock: ${item.quantity} ${item.unit_of_measurement}` : `${totalCount} recorded stock transactions`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={item ? "Search reasons or orders..." : "Search item, SKU, reason, order..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !item && fetchMovements()}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!item && (
              <button
                type="button"
                onClick={fetchMovements}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1"
                title="Search"
              >
                <Search size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Movement Types</option>
              <option value="STOCK_IN">Stock In (+)</option>
              <option value="STOCK_OUT">Stock Out (-)</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>

            <button
              onClick={fetchMovements}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm">
              <RefreshCw size={24} className="animate-spin mb-2 text-blue-500" />
              Loading movement logs...
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No stock movements found matching your filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800/60 sticky top-0 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  {!item && <th className="px-4 py-3">Item / SKU</th>}
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-center">Previous → Resulting</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Related Order</th>
                  <th className="px-4 py-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {formatDate(m.created_at)}
                    </td>
                    {!item && (
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{m.item_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.item_sku}</div>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getBadge(m.transaction_type)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                      {m.transaction_type === 'STOCK_IN' && (
                        <span className="text-emerald-600 dark:text-emerald-400">+{m.quantity}</span>
                      )}
                      {m.transaction_type === 'STOCK_OUT' && (
                        <span className="text-rose-600 dark:text-rose-400">-{m.quantity}</span>
                      )}
                      {m.transaction_type === 'ADJUSTMENT' && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {m.resulting_quantity - m.previous_quantity >= 0 ? `+${m.resulting_quantity - m.previous_quantity}` : m.resulting_quantity - m.previous_quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span className="text-slate-400">{m.previous_quantity}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{m.resulting_quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {m.reason}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.reference_order ? (
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {m.reference_order}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.user_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!item && totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} ({totalCount} total entries)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
