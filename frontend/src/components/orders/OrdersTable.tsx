import React from 'react';
import type { Order, OrderStatus } from '../../types/order';
import { 
  Eye, 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  Truck, 
  CheckCheck, 
  XCircle, 
  AlertCircle,
  PackageCheck,
} from 'lucide-react';

interface Props {
  orders: Order[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (payment: string) => void;
  onViewOrder: (order: Order) => void;
  onOpenInvoice: (order: Order) => void;
  onStatusChangeQuick?: (order: Order, newStatus: OrderStatus) => void;
}

const STATUS_TABS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Confirmed', label: 'Confirmed' },
  { id: 'Dispatched', label: 'Dispatched' },
  { id: 'Delivered', label: 'Delivered' },
  { id: 'Cancelled', label: 'Cancelled' },
];

export const OrdersTable: React.FC<Props> = ({
  orders,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  onViewOrder,
  onOpenInvoice,
}) => {
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <CheckCircle2 size={12} />
            Confirmed
          </span>
        );
      case 'Dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Truck size={12} />
            Dispatched
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCheck size={12} />
            Delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle size={12} />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header controls & filter tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
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

        {/* Search & Secondary Filters */}
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
              placeholder="Search by order #, customer, or items..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => onPaymentFilterChange(e.target.value)}
              aria-label="Filter orders by payment status"
              className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Payment: All</option>
              <option value="Paid">Paid Only</option>
              <option value="Unpaid">Unpaid Only</option>
              <option value="Partially Paid">Partially Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800 select-none">
            <tr>
              <th className="py-3 px-4 whitespace-nowrap">Order #</th>
              <th className="py-3 px-4 whitespace-nowrap">Customer</th>
              <th className="py-3 px-4 whitespace-nowrap">Date</th>
              <th className="py-3 px-4 whitespace-nowrap">Items Ordered</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Total Amount</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Payment</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Stock Status</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Order Status</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading orders...</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <AlertCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No orders found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new order.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Order Number */}
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {order.order_number}
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {order.customer_name}
                    </div>
                    {order.customer_phone && (
                      <div className="text-[11px] text-slate-400">{order.customer_phone}</div>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>

                  {/* Items summary */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      <span className="text-slate-400 text-[11px] ml-1">
                        ({order.items.map((i) => `${i.quantity}x ${i.item_name || 'Item'}`).join(', ')})
                      </span>
                    </div>
                  </td>

                  {/* Total Amount */}
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Payment */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {getPaymentBadge(order.payment_status)}
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {order.payment_method}
                    </span>
                  </td>

                  {/* Stock Deduction Status */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {order.stock_deducted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <PackageCheck size={13} />
                        Deducted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Clock size={13} />
                        Not Deducted
                      </span>
                    )}
                  </td>

                  {/* Order Status */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Details */}
                      <button
                        onClick={() => onViewOrder(order)}
                        title="View Details"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                      >
                        <Eye size={15} />
                      </button>

                      {/* Invoice */}
                      <button
                        onClick={() => onOpenInvoice(order)}
                        title="View & Print Invoice"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                      >
                        <FileText size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
