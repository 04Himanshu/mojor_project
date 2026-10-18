import React from 'react';
import type { PurchaseOrder } from '../../types/procurement';
import { Search, FileText, Truck, Printer, Clock } from 'lucide-react';

interface Props {
  orders: PurchaseOrder[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onOpenCreatePOModal: () => void;
  onOpenReceiveGoodsModal: (po: PurchaseOrder) => void;
  onOpenPOVoucherModal: (po: PurchaseOrder) => void;
  onUpdateStatus?: (poId: number, status: string) => void;
}

const PO_STATUS_TABS = [
  { id: 'ALL', label: 'All POs' },
  { id: 'Draft', label: 'Draft' },
  { id: 'Issued', label: 'Issued / Open' },
  { id: 'Partially Received', label: 'Partially Received' },
  { id: 'Received', label: 'Fully Received' },
  { id: 'Cancelled', label: 'Cancelled' },
];

export const PurchaseOrdersTable: React.FC<Props> = ({
  orders,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenCreatePOModal,
  onOpenReceiveGoodsModal,
  onOpenPOVoucherModal,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Received':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Received
          </span>
        );
      case 'Partially Received':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Partially Received
          </span>
        );
      case 'Issued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Issued
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
          {PO_STATUS_TABS.map((tab) => {
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

        {/* Search & Actions */}
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
              placeholder="Search by PO #, vendor name, or notes..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          <button
            onClick={onOpenCreatePOModal}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <FileText size={15} />
            <span>+ Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800 select-none">
            <tr>
              <th className="py-3 px-4 whitespace-nowrap">PO Number</th>
              <th className="py-3 px-4 whitespace-nowrap">Supplier</th>
              <th className="py-3 px-4 whitespace-nowrap">Order Date</th>
              <th className="py-3 px-4 whitespace-nowrap">Items & Fulfillment</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Total Cost</th>
              <th className="py-3 px-4 whitespace-nowrap text-center">Status</th>
              <th className="py-3 px-4 whitespace-nowrap text-center">Payment</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileText size={36} className="text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-medium">No purchase orders found</p>
                    <p className="text-xs text-slate-400">Issue a new purchase order to start inbound procurement.</p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((po) => {
                const totalOrdered = po.items.reduce((sum, i) => sum + i.quantity_ordered, 0);
                const totalReceived = po.items.reduce((sum, i) => sum + i.quantity_received, 0);
                const fulfillmentPercent = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
                const canReceive = po.status !== 'Received' && po.status !== 'Cancelled';

                return (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* PO Number */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {po.po_number}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {po.items.length} {po.items.length === 1 ? 'line item' : 'line items'}
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                        {po.supplier_name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Terms: {po.payment_terms}
                      </div>
                    </td>

                    {/* Order Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-800 dark:text-slate-200">
                        {new Date(po.order_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      {po.expected_delivery_date && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          <span>Exp: {new Date(po.expected_delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      )}
                    </td>

                    {/* Items & Fulfillment Progress */}
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {totalReceived} of {totalOrdered} received
                          </span>
                          <span className="font-bold text-[10px] text-slate-500">
                            {fulfillmentPercent}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              fulfillmentPercent === 100
                                ? 'bg-emerald-500'
                                : fulfillmentPercent > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{ width: `${fulfillmentPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                          {po.items.map(it => `${it.item_name} (x${it.quantity_ordered})`).join(', ')}
                        </div>
                      </div>
                    </td>

                    {/* Total Cost */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹{po.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tax: ₹{po.tax_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      {getStatusBadge(po.status)}
                    </td>

                    {/* Payment */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      {getPaymentBadge(po.payment_status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canReceive && (
                          <button
                            onClick={() => onOpenReceiveGoodsModal(po)}
                            title="Receive Inbound Goods (GRN)"
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1"
                          >
                            <Truck size={12} />
                            <span>Receive</span>
                          </button>
                        )}
                        <button
                          onClick={() => onOpenPOVoucherModal(po)}
                          title="View / Print PO Document"
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                        >
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
