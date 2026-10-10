
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Factory,
  ArrowRightLeft,
  Users,
  Settings,
  ShieldCheck,
  Ban,
  ArchiveRestore,
  PackageCheck,
  Undo2,
  CalendarDays,
  Layers,
  Banknote,
  Truck
} from 'lucide-react';

const Sidebar = () => {
  const operationsLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Inventory', path: '/inventory', icon: <PackageSearch size={18} /> },
    { name: 'Orders', path: '/orders', icon: <ShoppingCart size={18} /> },
    { name: 'Manufacturing', path: '/manufacturing', icon: <Factory size={18} /> },
    { name: 'Transfers', path: '/transfers', icon: <ArrowRightLeft size={18} /> },
    { name: 'Vendors', path: '/vendors', icon: <Users size={18} /> },
    { name: 'Users & Roles', path: '/users', icon: <Settings size={18} /> },
  ];

  const warehouseLinks = [
    { name: 'Quality Control', path: '/qc', icon: <ShieldCheck size={18} /> },
    { name: 'Scrap / Damaged', path: '/scrap', icon: <Ban size={18} /> },
    { name: 'Putaway Rules', path: '/putaway', icon: <ArchiveRestore size={18} /> },
    { name: 'Pick→Pack→Ship', path: '/fulfillment', icon: <PackageCheck size={18} /> },
    { name: 'Backorders', path: '/backorders', icon: <Undo2 size={18} /> },
    { name: 'Returns', path: '/returns', icon: <Undo2 size={18} /> },
    { name: 'Expiry / FEFO', path: '/expiry', icon: <CalendarDays size={18} /> },
    { name: 'Variants', path: '/variants', icon: <Layers size={18} /> },
    { name: 'Price Lists', path: '/pricelists', icon: <Banknote size={18} /> },
    { name: 'Dropshipping', path: '/dropshipping', icon: <Truck size={18} /> },
  ];

  const NavItem = ({ item }: { item: any }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isActive
          ? 'bg-blue-600 text-white rounded-md'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white rounded-md'
        }`
      }
    >
      {item.icon}
      {item.name}
    </NavLink>
  );

  return (
    <aside className="w-64 bg-[#0B1727] flex flex-col h-full border-r border-slate-800 overflow-y-auto custom-scrollbar">
      {/* Logo Area */}
      <div className="h-[64px] box-border shrink-0 flex items-center gap-2 px-6 border-b border-slate-800 sticky top-0 bg-[#0B1727] z-10">
        <div className="bg-blue-500 p-1.5 rounded-lg flex items-center justify-center">
          <PackageSearch size={20} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-wide">EOM</span>
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

        {/* Warehouse Section */}
        <div>
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Warehouse
          </p>
          <div className="space-y-1">
            {warehouseLinks.map((link) => (
              <NavItem key={link.name} item={link} />
            ))}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="mt-auto p-4 border-t border-slate-800 bg-[#08111C] sticky bottom-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <div>
            <p className="text-sm font-medium text-white">Admin User</p>
            <span className="text-[10px] font-semibold bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
              admin
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
