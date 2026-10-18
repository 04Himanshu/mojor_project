import React from 'react';
import type { Supplier } from '../../types/procurement';
import { Search, Star, Building2, Phone, Mail, MapPin, Plus, Edit2, Trash2 } from 'lucide-react';

interface Props {
  suppliers: Supplier[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onCreatePOForSupplier: (supplier: Supplier) => void;
  onToggleSupplierStatus: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplier: Supplier) => void;
  onOpenCreateModal: () => void;
}

export const SuppliersTable: React.FC<Props> = ({
  suppliers,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onEditSupplier,
  onCreatePOForSupplier,
  onToggleSupplierStatus,
  onDeleteSupplier,
  onOpenCreateModal
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header controls & filter tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search vendor by name, contact, city, or GSTIN..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          {/* Filter & Action */}
          <div className="flex items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              aria-label="Filter suppliers by status"
              className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Status: All Vendors</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            <button
              onClick={onOpenCreateModal}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} />
              <span>Add Supplier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800 select-none">
            <tr>
              <th className="py-3 px-4 whitespace-nowrap">Supplier / Vendor</th>
              <th className="py-3 px-4 whitespace-nowrap">Contact Person</th>
              <th className="py-3 px-4 whitespace-nowrap">Contact Channels</th>
              <th className="py-3 px-4 whitespace-nowrap">GSTIN & Terms</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Spend / Orders</th>
              <th className="py-3 px-4 whitespace-nowrap text-center">Status</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Building2 size={36} className="text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-medium">No suppliers match your criteria</p>
                    <p className="text-xs text-slate-400">Add your first vendor record or refine search filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Supplier Name & Rating */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center font-bold text-xs shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            {s.rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} />
                          <span>{s.city ? `${s.city}, ${s.country}` : s.country}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact Person */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {s.contact_person || 'Not Assigned'}
                    </span>
                  </td>

                  {/* Contact Channels */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="space-y-0.5">
                      {s.email && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <Mail size={12} className="text-slate-400" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <Phone size={12} className="text-slate-400" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* GSTIN & Terms */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div>
                      <span className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {s.gstin || 'Unregistered'}
                      </span>
                      <div className="mt-0.5">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                          {s.payment_terms}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Spend / Orders */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{s.total_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {s.total_orders} {s.total_orders === 1 ? 'PO' : 'POs'} ({s.open_orders} open)
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-center">
                    <button
                      type="button"
                      onClick={() => onToggleSupplierStatus(s)}
                      title={`Click to ${s.is_active ? 'deactivate' : 'activate'} ${s.name}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                        s.is_active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          s.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onCreatePOForSupplier(s)}
                        title="Create Purchase Order"
                        className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors border border-blue-200 dark:border-blue-800/60"
                      >
                        + PO
                      </button>
                      <button
                        onClick={() => onEditSupplier(s)}
                        title="Edit Supplier"
                        className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      {onDeleteSupplier && (
                        <button
                          onClick={() => onDeleteSupplier(s)}
                          title="Delete Supplier"
                          className="p-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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
