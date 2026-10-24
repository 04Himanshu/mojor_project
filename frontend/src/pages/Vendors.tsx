import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, RefreshCw, FileText, Truck, Users } from 'lucide-react';
import type {
  Supplier,
  PurchaseOrder,
  GoodsReceipt,
  ProcurementStats,
  SupplierCreatePayload,
  PurchaseOrderCreatePayload,
  GoodsReceiptCreatePayload
} from '../types/procurement';
import { procurementApi } from '../services/procurementApi';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ProcurementStatsCards } from '../components/procurement/ProcurementStatsCards';
import { SuppliersTable } from '../components/procurement/SuppliersTable';
import { PurchaseOrdersTable } from '../components/procurement/PurchaseOrdersTable';
import { GoodsReceiptsTable } from '../components/procurement/GoodsReceiptsTable';
import { CreateSupplierModal } from '../components/procurement/CreateSupplierModal';
import { CreatePurchaseOrderModal } from '../components/procurement/CreatePurchaseOrderModal';
import { ReceiveGoodsModal } from '../components/procurement/ReceiveGoodsModal';
import { POVoucherModal } from '../components/procurement/POVoucherModal';

export const Vendors: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers' | 'receipts'>('orders');
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state for Suppliers
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('ALL');

  // Search & Filter state for Purchase Orders
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('ALL');

  // Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<number | undefined>(undefined);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);

  const [isPOVoucherModalOpen, setIsPOVoucherModalOpen] = useState(false);
  const [voucherPO, setVoucherPO] = useState<PurchaseOrder | null>(null);

  // Deletion confirmation state
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Data fetching
  const loadStats = useCallback(async () => {
    try {
      const data = await procurementApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load procurement stats', err);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const is_active = supplierStatusFilter === 'ALL' ? undefined : supplierStatusFilter === 'ACTIVE';
      const data = await procurementApi.getSuppliers({
        search: supplierSearch.trim() || undefined,
        is_active
      });
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to load suppliers', err);
    }
  }, [supplierSearch, supplierStatusFilter]);

  const loadOrders = useCallback(async () => {
    try {
      const data = await procurementApi.getPurchaseOrders({
        status: poStatusFilter !== 'ALL' ? poStatusFilter : undefined,
        search: poSearch.trim() || undefined
      });
      setOrders(data);
    } catch (err) {
      console.error('Failed to load purchase orders', err);
    }
  }, [poSearch, poStatusFilter]);

  const loadReceipts = useCallback(async () => {
    try {
      const data = await procurementApi.getGoodsReceipts();
      setReceipts(data);
    } catch (err) {
      console.error('Failed to load goods receipts', err);
    }
  }, []);

  const refreshAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadSuppliers(), loadOrders(), loadReceipts()]);
    } catch (err) {
      console.error('Error refreshing data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // Supplier handlers
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (data: SupplierCreatePayload, supplierId?: number) => {
    if (supplierId) {
      await procurementApi.updateSupplier(supplierId, data);
      toast.success('Supplier profile updated successfully!', 'Supplier Saved');
    } else {
      await procurementApi.createSupplier(data);
      toast.success('New supplier registered successfully!', 'Supplier Registered');
    }
    await refreshAllData();
  };

  const handleToggleSupplierStatus = async (supplier: Supplier) => {
    try {
      await procurementApi.updateSupplier(supplier.id, { is_active: !supplier.is_active });
      toast.info(`Supplier "${supplier.name}" ${supplier.is_active ? 'deactivated' : 'activated'} successfully.`, 'Status Changed');
      await refreshAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to change supplier status', 'Update Error');
    }
  };

  const handleConfirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await procurementApi.deleteSupplier(supplierToDelete.id);
      toast.success(`Supplier "${supplierToDelete.name}" was permanently removed.`, 'Supplier Deleted');
      await refreshAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete supplier', 'Delete Failed');
    } finally {
      setSupplierToDelete(null);
    }
  };

  // PO handlers
  const handleOpenCreatePO = (preselectedId?: number) => {
    setPreselectedSupplierId(preselectedId);
    setIsCreatePOModalOpen(true);
  };

  const handleSavePO = async (data: PurchaseOrderCreatePayload) => {
    await procurementApi.createPurchaseOrder(data);
    toast.success('Purchase order generated and saved successfully!', 'PO Issued');
    await refreshAllData();
    setActiveTab('orders');
  };

  const handleUpdatePOStatus = async (poId: number, status: string) => {
    try {
      await procurementApi.updatePOStatus(poId, { status });
      toast.info(`Purchase order status updated to ${status}.`, 'PO Status Updated');
      await refreshAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update PO status', 'Update Error');
    }
  };

  // GRN Goods Receiving handlers
  const handleOpenReceiveGoods = (po: PurchaseOrder) => {
    setReceivingPO(po);
    setIsReceiveModalOpen(true);
  };

  const handleConfirmReceiveGoods = async (data: GoodsReceiptCreatePayload) => {
    const res = await procurementApi.receiveGoods(data);
    toast.success(`Goods inwarded! Generated GRN ${res.grn_number} and updated inventory counts.`, 'GRN Processed');
    await refreshAllData();
  };

  const handleOpenPOVoucher = (po: PurchaseOrder) => {
    setVoucherPO(po);
    setIsPOVoucherModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="text-blue-500" size={24} />
            Vendor & Procurement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage suppliers, purchase orders, goods receipts (GRN), and stock inwarding
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => refreshAllData()}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateSupplier}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>New Supplier</span>
          </button>

          <button
            onClick={() => handleOpenCreatePO()}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <FileText size={14} />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <ProcurementStatsCards stats={stats} />

      {/* Main Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileText size={15} />
          <span>Purchase Orders</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-medium">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Users size={15} />
          <span>Suppliers & Vendors</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium">
            {suppliers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'receipts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Truck size={15} />
          <span>Goods Received (GRN)</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
            {receipts.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'orders' && (
        <PurchaseOrdersTable
          orders={orders}
          search={poSearch}
          onSearchChange={setPoSearch}
          statusFilter={poStatusFilter}
          onStatusFilterChange={setPoStatusFilter}
          onOpenCreatePOModal={() => handleOpenCreatePO()}
          onOpenReceiveGoodsModal={handleOpenReceiveGoods}
          onOpenPOVoucherModal={handleOpenPOVoucher}
          onUpdateStatus={handleUpdatePOStatus}
        />
      )}

      {activeTab === 'suppliers' && (
        <SuppliersTable
          suppliers={suppliers}
          search={supplierSearch}
          onSearchChange={setSupplierSearch}
          statusFilter={supplierStatusFilter}
          onStatusFilterChange={setSupplierStatusFilter}
          onEditSupplier={handleEditSupplier}
          onCreatePOForSupplier={(sup) => handleOpenCreatePO(sup.id)}
          onToggleSupplierStatus={handleToggleSupplierStatus}
          onDeleteSupplier={(sup) => setSupplierToDelete(sup)}
          onOpenCreateModal={handleOpenCreateSupplier}
        />
      )}

      {activeTab === 'receipts' && (
        <GoodsReceiptsTable receipts={receipts} />
      )}

      {/* Modals */}
      <CreateSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSubmit={handleSaveSupplier}
        editSupplier={editingSupplier}
      />

      <CreatePurchaseOrderModal
        isOpen={isCreatePOModalOpen}
        onClose={() => setIsCreatePOModalOpen(false)}
        onSubmit={handleSavePO}
        suppliers={suppliers.filter((s) => s.is_active)}
        preselectedSupplierId={preselectedSupplierId}
      />

      <ReceiveGoodsModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        onSubmit={handleConfirmReceiveGoods}
        purchaseOrder={receivingPO}
      />

      <POVoucherModal
        isOpen={isPOVoucherModalOpen}
        onClose={() => setIsPOVoucherModalOpen(false)}
        purchaseOrder={voucherPO}
      />

      {/* Professional Delete Supplier Confirmation Modal */}
      <ConfirmModal
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={handleConfirmDeleteSupplier}
        title="Delete Supplier Profile"
        subtitle="Permanent vendor directory removal"
        message={`Are you sure you want to delete supplier "${supplierToDelete?.name}"? Deleting this supplier removes contact records and commercial payment terms from procurement lookup.`}
        itemName={supplierToDelete ? `${supplierToDelete.name} • ${supplierToDelete.city || 'Vendor'}` : undefined}
        itemType="SUPPLIER RECORD"
        confirmText="Delete Supplier"
        variant="danger"
      />
    </div>
  );
};

export default Vendors;
