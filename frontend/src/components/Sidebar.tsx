import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Building2,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const operationsLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={17} /> },
    { name: 'Inventory', path: '/inventory', icon: <PackageSearch size={17} /> },
    { name: 'Orders', path: '/orders', icon: <ShoppingCart size={17} /> },
    { name: 'Vendors', path: '/vendors', icon: <Building2 size={17} /> },
    { name: 'Users & Roles', path: '/users', icon: <ShieldCheck size={17} /> },
  ];

  const NavItem = ({ item }: { item: typeof operationsLinks[0] }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 group select-none ${
          isActive
            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25 shadow-sm shadow-blue-500/10'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`transition-colors duration-150 ${
              isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          >
            {item.icon}
          </span>
          <span className="flex-1 tracking-tight">{item.name}</span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500 animate-pulse" />
          )}
        </>
      )}
    </NavLink>
  );

  const getAvatarBg = (color?: string) => {
    switch (color) {
      case 'purple':
        return 'bg-purple-600 text-white';
      case 'blue':
        return 'bg-blue-600 text-white';
      case 'indigo':
        return 'bg-indigo-600 text-white';
      case 'emerald':
        return 'bg-emerald-600 text-white';
      case 'amber':
        return 'bg-amber-600 text-white';
      case 'rose':
        return 'bg-rose-600 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const handleLogout = () => {
    logout();
    toast.info('You have safely signed out of Enterprise Operations.', 'Session Closed');
  };

  return (
    <aside className="w-64 bg-[#0B1220] dark:bg-[#070C18] flex flex-col h-full border-r border-slate-800/80 overflow-y-auto select-none shrink-0 custom-scrollbar z-20">
      {/* Brand Header */}
      <div className="h-[64px] box-border shrink-0 flex items-center justify-between px-5 border-b border-slate-800/80 sticky top-0 bg-[#0B1220]/95 dark:bg-[#070C18]/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/25 ring-1 ring-white/10">
            <PackageSearch size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-sm tracking-tight leading-none font-sans">
                EOM
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 rounded-md border border-blue-500/20 leading-none">
                Enterprise
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide block mt-1">
              Operations Manager
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-5 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Operations & Log
          </p>
          <div className="space-y-1">
            {operationsLinks.map((link) => (
              <NavItem key={link.name} item={link} />
            ))}
          </div>
        </div>
      </div>

      {/* User Profile Card & Sign Out */}
      <div className="p-3 border-t border-slate-800/80 bg-[#080E1A] dark:bg-[#050811] sticky bottom-0 z-10">
        <div className="flex items-center justify-between gap-2.5 bg-slate-900/70 border border-slate-800/90 p-2.5 rounded-xl hover:border-slate-700/80 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg ${getAvatarBg(
                user?.avatar_color
              )} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ring-1 ring-white/10`}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {user?.name || 'Staff User'}
              </p>
              <p className="text-[10px] font-medium text-slate-400 truncate leading-tight mt-0.5">
                {user?.role_name || 'Staff'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
