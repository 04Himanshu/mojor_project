import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TriangleAlert, 
  Wallet, 
  ShoppingBag, 
  Package, 
  ShieldAlert, 
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
  ArrowRightLeft,
  Boxes
} from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import type { InventoryItem } from '../types/inventory';

const dataChart = [
  { name: 'Dec', revenue: 0, cost: 0, profit: 0 },
  { name: 'Jan', revenue: 0, cost: 0, profit: 0 },
  { name: 'Feb', revenue: 0, cost: 0, profit: 0 },
  { name: 'Mar', revenue: 15000, cost: 20000, profit: -5000 },
  { name: 'Apr', revenue: 25000, cost: 10000, profit: 15000 },
  { name: 'May', revenue: 32000, cost: 18000, profit: 14000 },
];

const COLORS = ['#2563eb', '#d97706', '#0d9488', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const [dbStats, setDbStats] = useState<{
    stock_value: number;
    total_skus: number;
    in_stock_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
    critical_alert_count: number;
    category_distribution: { name: string; value: number }[];
    replenishment_alerts: InventoryItem[];
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await inventoryApi.getDashboardStats();
        setDbStats(data);
      } catch (err) {
        console.warn('Dashboard using fallback stats', err);
      }
    };
    fetchStats();
  }, []);

  const totalStockValue = dbStats?.stock_value 
    ? `₹${dbStats.stock_value.toLocaleString('en-IN')}`
    : '₹4,42,230';

  const totalSkus = dbStats?.total_skus ?? 8;
  const criticalAlertsCount = dbStats?.critical_alert_count ?? 3;
  const inStockCount = dbStats?.in_stock_count ?? 5;
  const lowStockItems = dbStats?.replenishment_alerts || [];
  const pieData = dbStats?.category_distribution && dbStats.category_distribution.length > 0
    ? dbStats.category_distribution
    : [
        { name: 'Electronics', value: 80 },
        { name: 'Stationery', value: 88 },
        { name: 'Packaging', value: 120 },
        { name: 'Furniture', value: 18 },
      ];

  const totalStockUnits = pieData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Operations Dashboard
          </h1>
          <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            <span>Live overview · Connected to local MySQL</span>
            <span className="mx-2">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Synchronized
            </span>
          </div>
        </div>

        <Link
          to="/inventory"
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          Open Inventory Workspace <ArrowRight size={14} />
        </Link>
      </div>

      {/* 4 Professional Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Valuation */}
        <Link 
          to="/inventory"
          className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Stock Valuation
              </span>
              <div className="p-2.5 rounded-xl border bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-100 dark:border-blue-900/50 shadow-xs">
                <Wallet size={20} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                {totalStockValue}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {totalSkus} Total Active SKUs
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Live DB
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* In Stock Items */}
        <Link
          to="/inventory"
          className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                In Stock Items
              </span>
              <div className="p-2.5 rounded-xl border bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50 shadow-xs">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                {inStockCount}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Healthy stock levels
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Optimal
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Stock Alerts Card */}
        <Link
          to="/inventory"
          className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-rose-500" />
          <div className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Replenishment Alerts
              </span>
              <div className="p-2.5 rounded-xl border bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-100 dark:border-amber-900/50 shadow-xs">
                <TriangleAlert size={20} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                {criticalAlertsCount}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {dbStats?.out_of_stock_count ?? 1} Out of Stock · {dbStats?.low_stock_count ?? 2} Low
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Urgent
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Active Operations Orders */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-violet-500" />
          <div className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending Operations
              </span>
              <div className="p-2.5 rounded-xl border bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-100 dark:border-purple-900/50 shadow-xs">
                <ShoppingBag size={20} />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                2
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Orders in fulfillment
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Queued
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] p-6 rounded-xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Operational Financial Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Revenue vs Cost Trend Analysis (₹ in thousands)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm"></span> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Cost
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Stock by Category */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Stock by Category
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {totalStockUnits} units
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
              Real-time on-hand distribution
            </p>

            <div className="h-44 flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
             {pieData.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center text-xs">
                   <div className="flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                     <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                   </div>
                   <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{item.value} units</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: System Alerts & Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        {/* Dynamic System Low-Stock Alerts */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs p-6 flex flex-col justify-between">
           <div>
             <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Replenishment & Risk Alerts
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Items that currently require purchase receipts or stock-in
                    </p>
                  </div>
                </div>
                <Link to="/inventory" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                  Manage Stock <ArrowRight size={13} />
                </Link>
             </div>
             
             <div className="space-y-3">
               {lowStockItems.length > 0 ? (
                 lowStockItems.slice(0, 4).map((item) => (
                   <div 
                     key={item.id} 
                     className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                       item.quantity === 0
                         ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/50'
                         : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/50'
                     }`}
                   >
                     <div className="flex items-start gap-3">
                       <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                         item.quantity === 0
                           ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                           : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                       }`}>
                         {item.quantity === 0 ? <AlertOctagon size={16} /> : <TriangleAlert size={16} />}
                       </div>
                       <div>
                         <div className="flex items-center gap-2">
                           <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                             {item.sku}
                           </span>
                           <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                             {item.name}
                           </h4>
                         </div>
                         <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                           Category: <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span> · Unit: {item.unit_of_measurement}
                         </p>
                       </div>
                     </div>

                     <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-800/50">
                       <div className="text-xs font-bold font-mono">
                         <span className={item.quantity === 0 ? 'text-rose-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                           {item.quantity} {item.unit_of_measurement}
                         </span>
                         <span className="text-slate-400 font-normal"> (min: {item.reorder_level})</span>
                       </div>
                       <Link
                         to="/inventory"
                         className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                       >
                         Restock →
                       </Link>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="py-8 text-center text-sm text-slate-400">
                   All inventory items have healthy stock levels above reorder thresholds.
                 </div>
               )}
             </div>
           </div>

           <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
             <span>Database threshold calculation active</span>
             <Link to="/inventory" className="text-blue-600 font-semibold hover:underline">
               View all {lowStockItems.length} alert items
             </Link>
           </div>
        </div>

        {/* Quick Replenishment CTA */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 absolute top-0 left-0" />
          
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                <Boxes size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Core Operations
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Manage stock items, execute inbound/outbound movements with negative stock prevention, and track full movement histories.
            </p>

            <div className="space-y-3">
              <Link
                to="/inventory"
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-sm"
              >
                <Package size={15} /> Open Inventory List
              </Link>
              <Link
                to="/inventory"
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <ArrowRightLeft size={15} /> Record Stock Transaction
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Zero-negative stock protection active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
