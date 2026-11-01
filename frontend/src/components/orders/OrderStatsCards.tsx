import React from 'react';
import type { OrderStats } from '../../types/order';
import { Wallet, Store, ShoppingBag, CheckCircle2, TrendingUp } from 'lucide-react';

interface Props {
  stats: OrderStats | null;
}

export const OrderStatsCards: React.FC<Props> = ({ stats }) => {
  if (!stats) return null;

  const paidPercent = stats.total_orders > 0 
    ? Math.round((stats.paid_count / stats.total_orders) * 100) 
    : 100;

  const cards = [
    {
      title: 'Total Sales Orders',
      value: stats.total_orders,
      subtitle: `${stats.total_units_sold || 0} units dispensed`,
      icon: <ShoppingBag size={18} />,
      iconContainer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      pillClass: 'badge-info',
      dotClass: 'bg-blue-500',
      pillText: 'All Volume'
    },
    {
      title: "Today's Shift Orders",
      value: stats.today_orders || 0,
      subtitle: `₹${Math.round(stats.today_revenue || 0).toLocaleString('en-IN')} taken today`,
      icon: <Store size={18} />,
      iconContainer: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      pillClass: 'badge-purple',
      dotClass: 'bg-indigo-500',
      pillText: 'Active Shift'
    },
    {
      title: 'Avg Order Basket (AOV)',
      value: `₹${Math.round(stats.aov || 0).toLocaleString('en-IN')}`,
      subtitle: stats.today_orders > 0 ? `₹${Math.round(stats.today_aov || 0).toLocaleString('en-IN')} today's avg` : 'Per checkout basket',
      icon: <TrendingUp size={18} />,
      iconContainer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      pillClass: 'badge-success',
      dotClass: 'bg-emerald-500',
      pillText: 'Basket Spend'
    },
    {
      title: 'Payment Settlement',
      value: `${stats.paid_count || stats.completed_count} Paid`,
      subtitle: stats.unpaid_count > 0 ? `${stats.unpaid_count} pending settlement` : '100% counter settlement',
      icon: <CheckCircle2 size={18} />,
      iconContainer: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      pillClass: 'badge-success',
      dotClass: 'bg-teal-500',
      pillText: `${paidPercent}% Settled`
    },
    {
      title: 'Total Gross Billings',
      value: `₹${Math.round(stats.total_revenue).toLocaleString('en-IN')}`,
      subtitle: `${stats.completed_count} completed checkouts`,
      icon: <Wallet size={18} />,
      iconContainer: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
      pillClass: 'badge-neutral',
      dotClass: 'bg-slate-500',
      pillText: 'Realized Sales'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
