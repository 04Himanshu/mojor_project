import React, { useState, useEffect, useCallback } from 'react';
import type { 
  InventoryItem, 
  InventoryStats, 
  TransactionType, 
  CreateItemPayload, 
  UpdateItemPayload, 
} from '../types/inventory';
import { inventoryApi } from '../services/inventoryApi';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { InventoryStatsCards } from '../components/inventory/InventoryStatsCards';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { ItemModal } from '../components/inventory/ItemModal';
import { StockTransactionModal } from '../components/inventory/StockTransactionModal';
import { MovementHistoryModal } from '../components/inventory/MovementHistoryModal';
import { 
  Plus, 
  History, 
  ArrowRightLeft, 
  AlertTriangle 
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { toast } = useToast();
  // Inventory list state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [transactionDefaultTab, setTransactionDefaultTab] = useState<TransactionType>('STOCK_IN');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  // Deletion confirmation state
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Fetch Inventory Items
  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getItems({
        search: search.trim() || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      });

      setItems(res.items);
      setTotalPages(res.total_pages);
      setTotalItems(res.total);
    } catch (err: any) {
      console.error('Failed to load inventory', err);
      toast.error('Failed to load inventory items. Make sure backend is running.', 'Network Error');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, sortBy, sortOrder, page, pageSize, toast]);

  // Fetch Stats & Categories
  const loadMetadata = async () => {
    try {
      const [statsData, categoriesData] = await Promise.all([
        inventoryApi.getStats(),
        inventoryApi.getCategories(),
      ]);
      setStats(statsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load stats/categories', err);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleCategoryFilterChange = (cat: string) => {
    setCategoryFilter(cat);
    setPage(1);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (
    payload: CreateItemPayload | UpdateItemPayload, 
    isEdit: boolean, 
    id?: number
  ) => {
    if (isEdit && id) {
      await inventoryApi.updateItem(id, payload as UpdateItemPayload);
      toast.success('Inventory item updated successfully!', 'Item Updated');
    } else {
      await inventoryApi.createItem(payload as CreateItemPayload);
      toast.success('New inventory item registered successfully!', 'SKU Registered');
    }
    loadInventory();
    loadMetadata();
  };

  // Delete Item Trigger & Handler
  const handleDeleteItem = (item: InventoryItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await inventoryApi.deleteItem(itemToDelete.id);
      toast.success(`Item "${itemToDelete.name}" (${itemToDelete.sku}) has been permanently deleted.`, 'SKU Deleted');
      loadInventory();
      loadMetadata();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete item', 'Delete Failed');
    } finally {
      setItemToDelete(null);
    }
  };

  // Open modals
  const handleAddNewItem = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleOpenTransaction = (item: InventoryItem | null, tab: TransactionType = 'STOCK_IN') => {
    setTransactionItem(item);
    setTransactionDefaultTab(tab);
    setIsTransactionModalOpen(true);
  };

  const handleViewHistory = (item: InventoryItem | null) => {
    setHistoryItem(item);
    setIsHistoryModalOpen(true);
  };

  const handleTransactionSuccess = () => {
    toast.success('Stock movement recorded and audit log updated successfully!', 'Movement Completed');
    loadInventory();
    loadMetadata();
  };

  const replenishmentNeededCount = (stats?.low_stock_count || 0) + (stats?.out_of_stock_count || 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Inventory Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time stock tracking, stock in/out movements, alerts and valuation
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleViewHistory(null)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs transition-colors flex items-center gap-1.5"
          >
            <History size={15} />
            Movement History
          </button>

          <button
            onClick={() => handleOpenTransaction(null, 'STOCK_IN')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowRightLeft size={15} />
            Stock In / Out
          </button>

          <button
            onClick={handleAddNewItem}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} />
            Add New Item
          </button>
        </div>
      </div>

      {/* Replenishment Alert Banner */}
      {replenishmentNeededCount > 0 && statusFilter === 'ALL' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-800 dark:text-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg shadow-xs shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Inventory Replenishment Required
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                <span className="font-semibold text-rose-600 dark:text-rose-400">{stats?.out_of_stock_count || 0} Out of Stock</span> and{' '}
                <span className="font-semibold text-amber-600 dark:text-amber-400">{stats?.low_stock_count || 0} below reorder threshold</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleStatusFilterChange('LOW_STOCK')}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors self-start sm:self-auto whitespace-nowrap shadow-xs hover:shadow-sm"
          >
            Review Low Stock Items →
          </button>
        </div>
      )}

      {/* 4. Stock Monitoring & KPI Cards */}
      <InventoryStatsCards stats={stats} />

      {/* 1. Inventory Table with embedded status tabs, search & category filters */}
      <InventoryTable
        items={items}
        loading={loading}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={handleCategoryFilterChange}
        categories={categories}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onOpenTransaction={handleOpenTransaction}
        onViewHistory={handleViewHistory}
      />

      {/* 2. Add / Edit Item Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        itemToEdit={editingItem}
        existingCategories={categories}
      />

      {/* 3. Stock In / Stock Out / Adjustment Modal */}
      <StockTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        item={transactionItem}
        allItems={items}
        defaultTab={transactionDefaultTab}
        onTransactionSuccess={handleTransactionSuccess}
        onStockIn={inventoryApi.stockIn}
        onStockOut={inventoryApi.stockOut}
        onStockAdjustment={inventoryApi.stockAdjustment}
      />

      {/* 5. Stock Movement History Modal */}
      <MovementHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        item={historyItem}
      />

      {/* 6. Professional Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Inventory SKU"
        subtitle="Permanent and irreversible removal from catalog"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? Deleting this SKU will permanently purge it from current inventory balances, reorder threshold checks, and warehouse stock picking sheets.`}
        itemName={itemToDelete ? `${itemToDelete.sku} • ${itemToDelete.name}` : undefined}
        itemType="INVENTORY SKU"
        confirmText="Delete SKU"
        variant="danger"
      />
    </div>
  );
};

export default Inventory;
