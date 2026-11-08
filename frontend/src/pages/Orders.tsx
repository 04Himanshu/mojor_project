import React, { useState, useEffect, useCallback } from 'react';
import type { Order, OrderStats } from '../types/order';
import { orderApi } from '../services/orderApi';
import { OrderStatsCards } from '../components/orders/OrderStatsCards';
import { OrdersTable } from '../components/orders/OrdersTable';
import { CreateOrderModal } from '../components/orders/CreateOrderModal';
import { OrderDetailsModal } from '../components/orders/OrderDetailsModal';
import { InvoiceModal } from '../components/orders/InvoiceModal';
import { useToast } from '../context/ToastContext';
import { useRBAC, PERMISSIONS } from '../utils/rbac';
import { Plus, RefreshCw, Store } from 'lucide-react';

export const Orders: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin: isUserAdmin, hasPermission: checkPerm } = useRBAC();
  const canCreate = isUserAdmin || checkPerm(PERMISSIONS.ORDERS_CREATE);

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') {
      toast.error(message, 'Counter Sale Notice');
    } else {
      toast.success(message, 'Counter Sale Notice');
    }
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.getOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        payment_status: paymentFilter !== 'ALL' ? paymentFilter : undefined,
        search: search.trim() || undefined
      });
      setOrders(data);
    } catch (err) {
      console.error(err);
      showNotification('Unable to load counter orders. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, search]);

  const loadStats = async () => {
    try {
      const data = await orderApi.getOrderStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load counter stats', err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    loadOrders();
    loadStats();
    showNotification('Counter sales records refreshed successfully!');
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleOpenInvoice = (order: Order) => {
    setInvoiceOrder(order);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Store className="text-blue-600 dark:text-blue-400" size={26} />
            <span>Walk-in Sales & Orders</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Point of sale counter orders, multi-item checkout, instant stock deduction, and official sales receipts
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className="btn-secondary"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-500' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
            >
              <Plus size={16} />
              <span>New Walk-in Sale</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <OrderStatsCards stats={stats} />

      {/* Orders Table */}
      <OrdersTable
        orders={orders}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        onViewOrder={handleViewOrder}
        onOpenInvoice={handleOpenInvoice}
      />

      {/* Modals */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadOrders();
          loadStats();
        }}
        showNotification={showNotification}
      />

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
        onStatusUpdated={() => {
          loadOrders();
          loadStats();
        }}
        onOpenInvoice={handleOpenInvoice}
        showNotification={showNotification}
      />

      <InvoiceModal
        order={invoiceOrder}
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setInvoiceOrder(null);
        }}
      />
    </div>
  );
};

export default Orders;
