import React from 'react';
import type { OrderStats } from '../../types/order';
import { Wallet, Clock, CheckCircle2, Truck, CheckCheck } from 'lucide-react';

interface Props {
  stats: OrderStats | null;
}

export const OrderStatsCards: React.FC<Props> = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Total Revenue',
      value: `₹${stats.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subtitle: `${stats.total_orders} Orders Placed`,
      icon: <Wallet size={18} />,
      iconContainer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      pillClass: 'badge-info',
      dotClass: 'bg-blue-500',
      pillText: 'Gross Sales'
    },
    {
      title: 'Pending Orders',
      value: stats.pending_count,
      subtitle: 'Awaiting confirmation',
      icon: <Clock size={18} />,
      iconContainer: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      pillClass: stats.pending_count > 0 ? 'badge-warning' : 'badge-neutral',
      dotClass: stats.pending_count > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-400',
      pillText: stats.pending_count > 0 ? 'Action Needed' : 'All Clear'
    },
    {
      title: 'Confirmed Orders',
      value: stats.confirmed_count,
      subtitle: 'Stock allocated',
      icon: <CheckCircle2 size={18} />,
      iconContainer: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      pillClass: 'badge-purple',
      dotClass: 'bg-indigo-500',
      pillText: 'Allocated'
    },
    {
      title: 'Dispatched Orders',
      value: stats.dispatched_count,
      subtitle: 'Shipped to customer',
      icon: <Truck size={18} />,
      iconContainer: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      pillClass: stats.dispatched_count > 0 ? 'badge-info' : 'badge-neutral',
      dotClass: stats.dispatched_count > 0 ? 'bg-sky-500' : 'bg-slate-400',
      pillText: stats.dispatched_count > 0 ? 'En Route' : 'Idle'
    },
    {
      title: 'Delivered Orders',
      value: stats.delivered_count,
      subtitle: 'Delivered to customer',
      icon: <CheckCheck size={18} />,
      iconContainer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      pillClass: 'badge-success',
      dotClass: 'bg-emerald-500',
      pillText: 'Completed'
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
