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
          <span className="badge-success">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Received
          </span>
        );
      case 'Partially Received':
        return (
          <span className="badge-warning">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Partially Received
          </span>
        );
      case 'Issued':
        return (
          <span className="badge-info">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Issued
          </span>
        );
      case 'Cancelled':
        return (
          <span className="badge-danger">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="badge-neutral">
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
          <span className="badge-success text-[10px]">
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="badge-warning text-[10px]">
            Partial
          </span>
        );
      default:
        return (
          <span className="badge-neutral text-[10px]">
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
          {PO_STATUS_TABS.map((tab) => {
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

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by PO number, vendor name, or notes..."
              className="input-base pl-9 text-xs"
            />
          </div>

          <button
            onClick={onOpenCreatePOModal}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0"
          >
            <FileText size={14} />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="table-th">PO Number</th>
              <th className="table-th">Supplier</th>
              <th className="table-th">Order Date</th>
              <th className="table-th">Items & Fulfillment</th>
              <th className="table-th text-right">Total Cost</th>
              <th className="table-th text-center">Status</th>
              <th className="table-th text-center">Payment</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileText size={32} className="text-slate-400 dark:text-slate-600 stroke-[1.5]" />
                    <p className="text-xs sm:text-sm font-medium">No purchase orders found</p>
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
                    className="table-row-hover"
                  >
                    {/* PO Number */}
                    <td className="table-td whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {po.po_number}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {po.items.length} {po.items.length === 1 ? 'line item' : 'line items'}
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="table-td">
                      <div className="font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                        {po.supplier_name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Terms: {po.payment_terms}
                      </div>
                    </td>

                    {/* Order Date */}
                    <td className="table-td whitespace-nowrap">
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
                    <td className="table-td min-w-[200px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {totalReceived} of {totalOrdered} received
                          </span>
                          <span className="font-mono font-bold text-[10px] text-slate-500">
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
                    <td className="table-td whitespace-nowrap text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹{po.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tax: ₹{po.tax_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="table-td whitespace-nowrap text-center">
                      {getStatusBadge(po.status)}
                    </td>

                    {/* Payment */}
                    <td className="table-td whitespace-nowrap text-center">
                      {getPaymentBadge(po.payment_status)}
                    </td>

                    {/* Actions */}
                    <td className="table-td whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canReceive && (
                          <button
                            onClick={() => onOpenReceiveGoodsModal(po)}
                            title="Receive Inbound Goods (GRN)"
                            className="btn-success text-[11px] py-1 px-2.5 flex items-center gap-1"
                          >
                            <Truck size={12} />
                            <span>Receive</span>
                          </button>
                        )}
                        <button
                          onClick={() => onOpenPOVoucherModal(po)}
                          title="View / Print PO Document"
                          className="btn-ghost p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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
