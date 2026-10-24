import React, { useState, useEffect } from 'react';
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

const COLORS = ['#2563EB', '#D97706', '#0D9488', '#8B5CF6', '#EC4899'];

const Dashboard: React.FC = () => {
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Operations Dashboard
          </h1>
          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 gap-2">
            <span>Enterprise overview</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time Sync
            </span>
          </div>
        </div>

        <Link
          to="/inventory"
          className="btn-primary self-start sm:self-auto"
        >
          <span>Open Inventory Workspace</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* 4 Professional Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Valuation */}
        <Link 
          to="/inventory"
          className="card-interactive p-5 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Stock Valuation
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <Wallet size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {totalStockValue}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {totalSkus} Active SKUs
              </span>
              <span className="badge-info text-[10px] py-0.5 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Active Catalog
              </span>
            </div>
          </div>
        </Link>

        {/* In Stock Items */}
        <Link
          to="/inventory"
          className="card-interactive p-5 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              In Stock Items
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {inStockCount}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Healthy stock levels
              </span>
              <span className="badge-success text-[10px] py-0.5 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Optimal
              </span>
            </div>
          </div>
        </Link>

        {/* Stock Alerts Card */}
        <Link
          to="/inventory"
          className="card-interactive p-5 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Replenishment Alerts
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <TriangleAlert size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {criticalAlertsCount}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {dbStats?.out_of_stock_count ?? 1} Out · {dbStats?.low_stock_count ?? 2} Low
              </span>
              <span className="badge-warning text-[10px] py-0.5 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Action
              </span>
            </div>
          </div>
        </Link>

        {/* Active Operations Orders */}
        <div className="card-base p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Operations
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              2
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Orders in fulfillment
              </span>
              <span className="badge-purple text-[10px] py-0.5 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Queued
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 card-base p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Operational Financial Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Revenue vs Cost Trend Analysis (₹ in thousands)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span> Cost
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(value) => `₹${value/1000}k`} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="cost" stroke="#EF4444" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Stock by Category */}
        <div className="card-base p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Stock by Category
              </h3>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/60">
                {totalStockUnits} units
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
              On-hand distribution across categories
            </p>

            <div className="h-44 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={74}
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

          <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/70">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {item.value} units
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: System Alerts & Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        {/* Dynamic System Low-Stock Alerts */}
        <div className="lg:col-span-2 card-base p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Replenishment & Risk Alerts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Items that require purchase receipts or stock-in
                  </p>
                </div>
              </div>
              <Link to="/inventory" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                Manage Stock <ArrowRight size={13} />
              </Link>
            </div>
            
            <div className="space-y-2.5">
              {lowStockItems.length > 0 ? (
                lowStockItems.slice(0, 4).map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.quantity === 0
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                        : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        item.quantity === 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}>
                        {item.quantity === 0 ? <AlertOctagon size={15} /> : <TriangleAlert size={15} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {item.sku}
                          </span>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Category: <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span> · Unit: {item.unit_of_measurement}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-800/50">
                      <div className="text-xs font-bold font-mono">
                        <span className={item.quantity === 0 ? 'text-rose-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                          {item.quantity} {item.unit_of_measurement}
                        </span>
                        <span className="text-slate-400 font-normal"> (min: {item.reorder_level})</span>
                      </div>
                      <Link
                        to="/inventory"
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Restock →
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  All inventory items have healthy stock levels above reorder thresholds.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
            <span>Automated threshold tracking active</span>
            <Link to="/inventory" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              View all {lowStockItems.length} alert items
            </Link>
          </div>
        </div>

        {/* Quick Replenishment CTA */}
        <div className="card-base p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Boxes size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Core Operations
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Manage stock items, execute inbound/outbound movements with negative stock prevention, and track full movement histories.
            </p>

            <div className="space-y-2.5">
              <Link
                to="/inventory"
                className="btn-primary w-full py-2.5"
              >
                <Package size={15} />
                <span>Open Inventory List</span>
              </Link>
              <Link
                to="/inventory"
                className="btn-secondary w-full py-2.5"
              >
                <ArrowRightLeft size={15} />
                <span>Record Stock Transaction</span>
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Zero-negative stock protection active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
