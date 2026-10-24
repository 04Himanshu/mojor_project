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
          <span className="badge-warning">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'Confirmed':
        return (
          <span className="badge-purple">
            <CheckCircle2 size={12} />
            Confirmed
          </span>
        );
      case 'Dispatched':
        return (
          <span className="badge-info">
            <Truck size={12} />
            Dispatched
          </span>
        );
      case 'Delivered':
        return (
          <span className="badge-success">
            <CheckCheck size={12} />
            Delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="badge-danger">
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
          <span className="badge-success text-[10px] py-0.5 px-2">
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="badge-warning text-[10px] py-0.5 px-2">
            Partial
          </span>
        );
      default:
        return (
          <span className="badge-neutral text-[10px] py-0.5 px-2">
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="table-container flex flex-col">
      {/* Header controls & filter tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onStatusFilterChange(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
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
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by order number, customer, or items..."
              className="input-base pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => onPaymentFilterChange(e.target.value)}
              aria-label="Filter orders by payment status"
              className="select-base w-44"
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
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="table-th whitespace-nowrap">Order Number</th>
              <th className="table-th min-w-[200px] whitespace-nowrap">Customer</th>
              <th className="table-th min-w-[110px] whitespace-nowrap">Date</th>
              <th className="table-th min-w-[220px] whitespace-nowrap">Items Ordered</th>
              <th className="table-th text-right whitespace-nowrap">Total Amount</th>
              <th className="table-th text-center whitespace-nowrap">Payment</th>
              <th className="table-th text-center whitespace-nowrap">Stock Allocation</th>
              <th className="table-th text-center whitespace-nowrap">Order Status</th>
              <th className="table-th text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-14 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading orders...</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center">
                  <AlertCircle size={30} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No orders found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new sales order.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="table-row-hover group"
                >
                  {/* Order Number */}
                  <td className="table-td whitespace-nowrap">
                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40">
                      {order.order_number}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="table-td min-w-[200px] whitespace-nowrap">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap" title={order.customer_name}>
                      {order.customer_name}
                    </div>
                    {order.customer_phone && (
                      <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap mt-0.5">
                        {order.customer_phone}
                      </div>
                    )}
                  </td>

                  {/* Date */}
                  <td className="table-td whitespace-nowrap text-slate-500 font-mono">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>

                  {/* Items summary */}
                  <td className="table-td max-w-xs">
                    <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      <span className="text-slate-400 text-[11px] ml-1">
                        ({order.items.map((i) => `${i.quantity}x ${i.item_name || 'Item'}`).join(', ')})
                      </span>
                    </div>
                  </td>

                  {/* Total Amount */}
                  <td className="table-td text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap tabular-nums">
                    ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Payment */}
                  <td className="table-td text-center whitespace-nowrap">
                    {getPaymentBadge(order.payment_status)}
                    <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                      {order.payment_method}
                    </span>
                  </td>

                  {/* Stock Deduction Status */}
                  <td className="table-td text-center whitespace-nowrap">
                    {order.stock_deducted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <PackageCheck size={13} />
                        Deducted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Clock size={13} />
                        Queued
                      </span>
                    )}
                  </td>

                  {/* Order Status */}
                  <td className="table-td text-center whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>

                  {/* Actions */}
                  <td className="table-td text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {/* View Details */}
                      <button
                        onClick={() => onViewOrder(order)}
                        title="View Order Details"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>

                      {/* Invoice */}
                      <button
                        onClick={() => onOpenInvoice(order)}
                        title="View & Print Official Invoice"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
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
