import React from 'react';
import type { GoodsReceipt } from '../../types/procurement';
import { Truck, PackageCheck, Calendar, UserCheck, ShieldCheck } from 'lucide-react';

interface Props {
  receipts: GoodsReceipt[];
}

export const GoodsReceiptsTable: React.FC<Props> = ({ receipts }) => {
  return (
    <div className="card-base overflow-hidden">
      {/* Header Info */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <PackageCheck size={18} className="text-emerald-500" />
            Goods Received Notes (GRN Audit Trail)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Physical stock inward logs, carrier tracking, inspection notes, and warehouse allocations
          </p>
        </div>
        <div className="badge-neutral text-xs">
          Total Shipments: {receipts.length}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="table-th">GRN Number</th>
              <th className="table-th">PO Reference</th>
              <th className="table-th">Supplier</th>
              <th className="table-th">Receipt Date & Receiver</th>
              <th className="table-th">Carrier & Tracking</th>
              <th className="table-th">Inwarded Items</th>
              <th className="table-th">Quality Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Truck size={32} className="text-slate-400 dark:text-slate-600 stroke-[1.5]" />
                    <p className="text-xs sm:text-sm font-medium">No goods receipt records found</p>
                    <p className="text-xs text-slate-400">Receive items against issued purchase orders to create inward shipments.</p>
                  </div>
                </td>
              </tr>
            ) : (
              receipts.map((grn) => {
                const totalUnits = grn.items.reduce((sum, it) => sum + it.quantity_received, 0);

                return (
                  <tr
                    key={grn.id}
                    className="table-row-hover"
                  >
                    {/* GRN Number */}
                    <td className="table-td whitespace-nowrap">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {grn.grn_number}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {totalUnits} units accepted
                      </div>
                    </td>

                    {/* PO Reference */}
                    <td className="table-td whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {grn.po_number}
                      </span>
                    </td>

                    {/* Supplier */}
                    <td className="table-td whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {grn.supplier_name}
                      </div>
                    </td>

                    {/* Receipt Date & Receiver */}
                    <td className="table-td whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        <Calendar size={12} className="text-slate-400" />
                        <span>
                          {new Date(grn.received_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <UserCheck size={11} />
                        <span>{grn.received_by}</span>
                      </div>
                    </td>

                    {/* Carrier & Tracking */}
                    <td className="table-td whitespace-nowrap">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {grn.carrier || 'Direct Supplier Delivery'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {grn.tracking_number ? `Track: ${grn.tracking_number}` : (grn.delivery_challan_number ? `DC: ${grn.delivery_challan_number}` : 'No Tracking')}
                      </div>
                    </td>

                    {/* Inwarded Items */}
                    <td className="table-td min-w-[200px]">
                      <div className="space-y-1">
                        {grn.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] gap-2">
                            <span className="text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                              {it.item_name}
                            </span>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                              +{it.quantity_received}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Quality Notes */}
                    <td className="table-td">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                        <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                        <span className="truncate max-w-[180px]">{grn.notes || (grn.items.length > 0 ? grn.items[0].condition_notes : 'Inspected & Passed')}</span>
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
