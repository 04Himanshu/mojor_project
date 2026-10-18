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

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const operationsLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Inventory', path: '/inventory', icon: <PackageSearch size={18} /> },
    { name: 'Orders', path: '/orders', icon: <ShoppingCart size={18} /> },
    { name: 'Vendors', path: '/vendors', icon: <Building2 size={18} /> },
    { name: 'Users & Roles', path: '/users', icon: <ShieldCheck size={18} /> },
  ];

  const NavItem = ({ item }: { item: any }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white rounded-xl'
            : 'text-slate-400 hover:bg-slate-800/80 hover:text-white rounded-xl'
        }`
      }
    >
      {item.icon}
      {item.name}
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
    <aside className="w-64 bg-[#0B1727] flex flex-col h-full border-r border-slate-800 overflow-y-auto custom-scrollbar select-none">
      {/* Logo Area */}
      <div className="h-[64px] box-border shrink-0 flex items-center gap-2.5 px-6 border-b border-slate-800 sticky top-0 bg-[#0B1727] z-10">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
          <PackageSearch size={18} className="text-white" />
        </div>
        <div>
          <span className="text-white font-bold text-base tracking-wide block leading-tight">
            EOM
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
            Operations
          </span>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-6">
        {/* Operations Section */}
        <div>
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Operations
          </p>
          <div className="space-y-1">
            {operationsLinks.map((link) => (
              <NavItem key={link.name} item={link} />
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic User Profile & Logout */}
      <div className="mt-auto p-3.5 border-t border-slate-800 bg-[#08111C] sticky bottom-0 z-10">
        <div className="flex items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg ${getAvatarBg(
                user?.avatar_color
              )} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user?.name || 'Staff User'}
              </p>
              <p className="text-[10px] font-medium text-slate-400 truncate">
                {user?.role_name || 'Staff'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
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
