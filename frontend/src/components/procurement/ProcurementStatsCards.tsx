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
      icon: <Wallet size={20} />,
      accentColor: 'from-blue-500 to-indigo-500',
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
      pill: {
        text: 'Total Purchases',
        style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
        dot: 'bg-blue-500'
      }
    },
    {
      title: 'Active Suppliers',
      value: stats.active_suppliers_count,
      subtitle: 'Verified vendor directory',
      icon: <Building2 size={20} />,
      accentColor: 'from-indigo-500 to-purple-500',
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
      pill: {
        text: 'Qualified Vendors',
        style: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
        dot: 'bg-indigo-500'
      }
    },
    {
      title: 'Open Purchase Orders',
      value: stats.open_po_count,
      subtitle: 'Awaiting delivery',
      icon: <FileText size={20} />,
      accentColor: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
      pill: {
        text: stats.open_po_count > 0 ? 'Fulfillment In-Progress' : 'All Clear',
        style: stats.open_po_count > 0 
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        dot: stats.open_po_count > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
      }
    },
    {
      title: 'Goods Received (GRN)',
      value: stats.goods_received_count,
      subtitle: `${stats.items_inwarded_total} units inwarded`,
      icon: <Truck size={20} />,
      accentColor: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      pill: {
        text: 'Stock Inwarded',
        style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        dot: 'bg-emerald-500'
      }
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.title}
          className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
        >
          {/* Subtle top accent gradient line */}
          <div className={`h-1 w-full bg-gradient-to-r ${c.accentColor}`} />

          <div className="p-4.5 sm:p-5 flex flex-col justify-between h-full space-y-3">
            {/* Header: Title & Icon */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none truncate">
                {c.title}
              </span>
              <div className={`p-2 rounded-xl border ${c.iconBg} shadow-2xs shrink-0 flex items-center justify-center`}>
                {c.icon}
              </div>
            </div>

            {/* Metric Value */}
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {c.value}
            </div>

            {/* Footer: Subtitle on Left, Pill Badge on Right (align like Healthy stock levels / Optimal) */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/60 gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate" title={c.subtitle}>
                {c.subtitle}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 shadow-2xs ${c.pill.style}`}>
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
