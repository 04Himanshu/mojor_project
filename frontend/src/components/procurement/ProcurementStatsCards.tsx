import React from 'react';
import type { ProcurementStats } from '../../types/procurement';
import { Wallet, Building2, FileText, Truck } from 'lucide-react';

interface Props {
  stats: ProcurementStats | null;
}

export const ProcurementStatsCards: React.FC<Props> = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Procurement Spend',
      value: `₹${Math.round(stats.total_procurement_spend).toLocaleString('en-IN')}`,
      subtitle: 'Issued & received orders',
      icon: <Wallet size={18} />,
      iconContainer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      pillClass: 'badge-info',
      dotClass: 'bg-blue-500',
      pillText: 'Total Spend'
    },
    {
      title: 'Active Suppliers',
      value: stats.active_suppliers_count,
      subtitle: 'Verified vendor directory',
      icon: <Building2 size={18} />,
      iconContainer: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      pillClass: 'badge-purple',
      dotClass: 'bg-indigo-500',
      pillText: 'Qualified'
    },
    {
      title: 'Open Purchase Orders',
      value: stats.open_po_count,
      subtitle: stats.open_po_count > 0 ? 'Awaiting fulfillment' : 'All POs fulfilled',
      icon: <FileText size={18} />,
      iconContainer: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      pillClass: stats.open_po_count > 0 ? 'badge-warning' : 'badge-neutral',
      dotClass: stats.open_po_count > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-400',
      pillText: stats.open_po_count > 0 ? 'In-Progress' : 'All Clear'
    },
    {
      title: 'Goods Received (GRN)',
      value: stats.goods_received_count,
      subtitle: `${stats.items_inwarded_total} units inwarded`,
      icon: <Truck size={18} />,
      iconContainer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      pillClass: 'badge-success',
      dotClass: 'bg-emerald-500',
      pillText: 'Stock Inwarded'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.title}
          className="card-base p-5 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700/90 transition-all duration-150"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none truncate">
                {c.title}
              </span>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${c.iconContainer}`}>
                {c.icon}
              </div>
            </div>

            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {c.value}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/70 text-xs gap-2 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 font-medium truncate min-w-0" title={c.subtitle}>
              {c.subtitle}
            </span>
            <span className={`${c.pillClass} text-[10px] py-0.5 px-2.5 whitespace-nowrap shrink-0`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dotClass}`} />
              <span className="whitespace-nowrap">{c.pillText}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
