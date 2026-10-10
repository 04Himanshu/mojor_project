import { useState, useEffect } from 'react';
import { Search, Bell, WifiOff, Moon, Sun } from 'lucide-react';

const Header = () => {
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
        {/* Offline Mode Indicator (mock) */}
        <div className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-800/50 rounded-md text-xs font-medium text-slate-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
          <WifiOff size={14} className="text-slate-400" />
          <span>Offline</span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Global search..." 
            className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        {/* Dark Mode Toggle */}
        <button 
          onClick={() => setIsDark(!isDark)} 
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative transition-colors">
          <Bell size={20} />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0F172A]"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-gray-200 dark:border-slate-800">
           <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">Admin User</p>
            <p className="text-[10px] text-pink-500 font-medium">admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
