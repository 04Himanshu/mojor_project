import React, { useState, useEffect } from 'react';
import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Header: React.FC = () => {
  const { toast } = useToast();

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <header className="h-[64px] box-border shrink-0 bg-white/85 dark:bg-[#0E1524]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-6 z-10 transition-colors duration-150">
      {/* Left Actions */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Live System Indicator */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">System Live</span>
        </div>

        {/* Global Quick Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={15}
          />
          <input
            type="text"
            placeholder="Search items, orders, vendors..."
            className="pl-9 pr-14 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 w-52 sm:w-72 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
          />
          <span className="hidden sm:block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-800 rounded border border-slate-300/50 dark:border-slate-700 select-none pointer-events-none">
            Ctrl K
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle color theme"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() =>
            toast.info(
              'All operational services and scheduled jobs are running smoothly.',
              'System Status'
            )
          }
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
          title="System Notifications"
          aria-label="View notifications"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#0E1524]"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
