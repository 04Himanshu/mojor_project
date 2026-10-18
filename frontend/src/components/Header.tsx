import { useState, useEffect } from 'react';
import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Header = () => {
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
    <header className="h-[64px] box-border shrink-0 bg-white dark:bg-[#0F172A] border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 transition-colors duration-300">
      {/* Left Actions */}
      <div className="flex items-center space-x-4">
        {/* Live System Indicator */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Global search..."
            className="pl-9 pr-4 py-1.5 text-xs bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() =>
            toast.info(
              'All system microservices, stock queues, and database connections are healthy.',
              'System Health'
            )
          }
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#0F172A]"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
