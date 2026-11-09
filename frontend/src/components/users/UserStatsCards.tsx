import React from 'react';
import type { UserStats } from '../../types/user';
import { Users, UserCheck, Shield, KeyRound } from 'lucide-react';

interface Props {
  stats: UserStats | null;
}

export const UserStatsCards: React.FC<Props> = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Total Staff',
      value: stats.total_users,
      subtitle: `${stats.active_users} of ${stats.total_users} active`,
      icon: <Users size={18} />,
      iconContainer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      pillClass: 'badge-info',
      dotClass: 'bg-blue-500',
      pillText: 'Staff Roster'
    },
    {
      title: 'Active Accounts',
      value: stats.active_users,
      subtitle: `${((stats.active_users / (stats.total_users || 1)) * 100).toFixed(0)}% enabled`,
      icon: <UserCheck size={18} />,
      iconContainer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      pillClass: stats.active_users > 0 ? 'badge-success' : 'badge-neutral',
      dotClass: stats.active_users > 0 ? 'bg-emerald-500' : 'bg-slate-400',
      pillText: stats.active_users > 0 ? 'Operational' : 'No Access'
    },
    {
      title: 'Configured Roles',
      value: stats.total_roles,
      subtitle: 'Access Levels',
      icon: <Shield size={18} />,
      iconContainer: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      pillClass: 'badge-purple',
      dotClass: 'bg-purple-500',
      pillText: 'Active Roles'
    },
    {
      title: 'Administrators',
      value: stats.admin_users,
      subtitle: 'System Administrators',
      icon: <KeyRound size={18} />,
      iconContainer: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      pillClass: 'badge-warning',
      dotClass: 'bg-amber-500 animate-pulse',
      pillText: 'Full Access'
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
