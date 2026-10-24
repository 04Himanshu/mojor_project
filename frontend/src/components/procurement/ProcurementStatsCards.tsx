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
      value: `₹${stats.total_procurement_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subtitle: 'Issued & received orders',
      icon: <Wallet size={18} />,
      accentColor: 'from-blue-500 to-indigo-500',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      pill: {
        text: 'Total Purchases',
        style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        dot: 'bg-blue-500'
      }
    },
    {
      title: 'Active Suppliers',
      value: stats.active_suppliers_count,
      subtitle: 'Verified vendor directory',
      icon: <Building2 size={18} />,
      accentColor: 'from-indigo-500 to-purple-500',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      pill: {
        text: 'Qualified Vendors',
        style: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        dot: 'bg-indigo-500'
      }
    },
    {
      title: 'Open Purchase Orders',
      value: stats.open_po_count,
      subtitle: 'Awaiting fulfillment',
      icon: <FileText size={18} />,
      accentColor: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      pill: {
        text: stats.open_po_count > 0 ? 'In-Progress' : 'All Clear',
        style: stats.open_po_count > 0 
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        dot: stats.open_po_count > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
      }
    },
    {
      title: 'Goods Received (GRN)',
      value: stats.goods_received_count,
      subtitle: `${stats.items_inwarded_total} units inwarded`,
      icon: <Truck size={18} />,
      accentColor: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      pill: {
        text: 'Stock Inwarded',
        style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500'
      }
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.title}
          className="card-base p-5 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
        >
          {/* Subtle top accent gradient line */}
          <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.accentColor}`} />

          <div className="flex flex-col justify-between h-full space-y-3 pt-1">
            {/* Header: Title & Icon */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none truncate">
                {c.title}
              </span>
              <div className={`p-2 rounded-xl border ${c.iconBg} shrink-0 flex items-center justify-center`}>
                {c.icon}
              </div>
            </div>

            {/* Metric Value */}
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {c.value}
            </div>

            {/* Footer: Subtitle on Left, Pill Badge on Right */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate" title={c.subtitle}>
                {c.subtitle}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${c.pill.style}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.pill.dot}`} />
                {c.pill.text}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
