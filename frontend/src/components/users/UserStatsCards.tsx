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
      icon: <Users size={20} />,
      accentColor: 'from-blue-500 to-indigo-500',
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
      pill: {
        text: 'Staff Roster',
        style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
        dot: 'bg-blue-500'
      }
    },
    {
      title: 'Active Accounts',
      value: stats.active_users,
      subtitle: `${((stats.active_users / (stats.total_users || 1)) * 100).toFixed(0)}% access enabled`,
      icon: <UserCheck size={20} />,
      accentColor: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      pill: {
        text: stats.active_users > 0 ? 'Operational' : 'No Access',
        style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        dot: 'bg-emerald-500'
      }
    },
    {
      title: 'Configured Roles',
      value: stats.total_roles,
      subtitle: 'RBAC Access Tiers',
      icon: <Shield size={20} />,
      accentColor: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-100 dark:border-purple-900/50',
      pill: {
        text: 'Security Matrix',
        style: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
        dot: 'bg-purple-500'
      }
    },
    {
      title: 'Administrators',
      value: stats.admin_users,
      subtitle: 'Full System Authority',
      icon: <KeyRound size={20} />,
      accentColor: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
      pill: {
        text: 'Root Privileges',
        style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        dot: 'bg-amber-500 animate-pulse'
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

            {/* Footer: Subtitle on Left, Pill Badge on Right */}
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
