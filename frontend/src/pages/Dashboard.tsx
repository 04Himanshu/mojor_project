import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
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
  ShoppingBag, 
  Package, 
  ShieldAlert, 
  ArrowRight, 
  AlertOctagon, 
  Boxes, 
  TrendingUp, 
  Store, 
  RefreshCw, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Receipt,
  Wallet,
  Clock,
  Search,
  CheckCircle2,
  ArrowUpRight,
  Printer,
  Sparkles
} from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import { orderApi } from '../services/orderApi';
import { InvoiceModal } from '../components/orders/InvoiceModal';
import type { DashboardAnalytics } from '../types/inventory';
import type { Order } from '../types/order';

// Consistent vibrant palette for payment methods & categories
const PAYMENT_COLORS: Record<string, string> = {
  Cash: '#10B981',       // Emerald
  'UPI / QR': '#6366F1',   // Indigo
  UPI: '#6366F1',
  'Card / POS': '#3B82F6', // Blue
  Card: '#3B82F6',
  'Bank Transfer': '#F59E0B', // Amber
  Transfer: '#F59E0B',
};

const CATEGORY_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];

const formatINR = (val: number): string => {
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
};

const formatCompactINR = (val: number): string => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${val}`;
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Interactive UI View Controls
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'orders' | 'units'>('revenue');
  const [topProductsMetric, setTopProductsMetric] = useState<'revenue' | 'units'>('revenue');
  const [txSearch, setTxSearch] = useState<string>('');
  const [txPaymentFilter, setTxPaymentFilter] = useState<string>('ALL');

  // Receipt modal state
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | null>(null);

  const fetchAnalytics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const stats = await inventoryApi.getDashboardStats();
      setData(stats);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('Dashboard fetch error', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handler to open full receipt modal
  const handleOpenReceipt = async (orderId: number) => {
    setReceiptLoadingId(orderId);
    try {
      const fullOrder = await orderApi.getOrderById(orderId);
      setSelectedOrderForReceipt(fullOrder);
    } catch (err) {
      console.error('Failed to load order receipt', err);
    } finally {
      setReceiptLoadingId(null);
    }
  };

  // Memoized KPI metrics
  const kpis = useMemo(() => {
    return data?.sales_kpis || {
      today_revenue: 0,
      today_orders: 0,
      total_revenue: 0,
      total_orders: 0,
      aov: 0,
      total_units_sold: 0,
    };
  }, [data]);

  const salesTrend = useMemo(() => data?.sales_trend || [], [data]);
  const paymentDistribution = useMemo(() => data?.payment_distribution || [], [data]);
  const categorySales = useMemo(() => data?.category_sales || [], [data]);
  const recentTransactions = useMemo(() => data?.recent_transactions || [], [data]);
  const lowStockItems = useMemo(() => data?.replenishment_alerts || [], [data]);

  // Derived peak day metric
  const peakDay = useMemo(() => {
    if (salesTrend.length === 0) return null;
    return salesTrend.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), salesTrend[0]);
  }, [salesTrend]);

  // Derived filtered recent transactions
  const filteredTransactions = useMemo(() => {
    return recentTransactions.filter((tx) => {
      const matchesSearch = 
        tx.order_number.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.customer_name.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.items_summary.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.user_name.toLowerCase().includes(txSearch.toLowerCase());

      const matchesPayment = 
        txPaymentFilter === 'ALL' || 
        tx.payment_method.toLowerCase().includes(txPaymentFilter.toLowerCase());

      return matchesSearch && matchesPayment;
    });
  }, [recentTransactions, txSearch, txPaymentFilter]);

  // Sorted Top Products based on selected metric
  const sortedTopProducts = useMemo(() => {
    const list = [...(data?.top_products || [])];
    if (topProductsMetric === 'revenue') {
      return list.sort((a, b) => b.revenue - a.revenue);
    }
    return list.sort((a, b) => b.units_sold - a.units_sold);
  }, [data?.top_products, topProductsMetric]);

  const maxProductMetricValue = useMemo(() => {
    if (sortedTopProducts.length === 0) return 1;
    return topProductsMetric === 'revenue' 
      ? Math.max(...sortedTopProducts.map(p => p.revenue), 1)
      : Math.max(...sortedTopProducts.map(p => p.units_sold), 1);
  }, [sortedTopProducts, topProductsMetric]);

  const totalPaymentValue = useMemo(() => {
    return paymentDistribution.reduce((acc, curr) => acc + curr.value, 0);
  }, [paymentDistribution]);

  // Payment method badge icon helper
  const getPaymentIcon = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('cash')) return <Banknote size={13} className="text-emerald-500" />;
    if (m.includes('upi') || m.includes('qr')) return <Smartphone size={13} className="text-indigo-500" />;
    if (m.includes('card') || m.includes('pos')) return <CreditCard size={13} className="text-blue-500" />;
    return <Wallet size={13} className="text-amber-500" />;
  };

  // High-Fidelity Executive Skeleton Loading State (Zero Layout Shift)
  if (loading && !data) {
    return (
      <div className="space-y-6 pb-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-3 w-80 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* 5 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card-base p-4 h-32 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-base p-5 h-80 bg-slate-100/50 dark:bg-slate-900/40 rounded-2xl" />
          <div className="card-base p-5 h-80 bg-slate-100/50 dark:bg-slate-900/40 rounded-2xl" />
        </div>

        {/* Lower Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-base p-5 h-72 bg-slate-100/50 dark:bg-slate-900/40 rounded-2xl" />
          <div className="card-base p-5 h-72 bg-slate-100/50 dark:bg-slate-900/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header & Fast POS Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-[#101726] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Store size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Operations & Sales Intelligence
                </h1>
                <span className="badge-info text-[10px] py-0.5 px-2 font-mono uppercase font-bold">
                  POS Enterprise
                </span>
              </div>
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-medium gap-2 mt-0.5">
                <span>Real-time Counter Sales, POS Transactions & Inventory Sync</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync ({lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={isRefreshing}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
            title="Refresh analytics data"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            <span>Sync</span>
          </button>

          <Link
            to="/walk-in-order"
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-md shadow-blue-500/20 hover:scale-[1.01] transition-transform"
          >
            <Store size={15} />
            <span>New Walk-in Order</span>
          </Link>

          <Link
            to="/inventory"
            className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <Package size={14} />
            <span>Inventory Master</span>
          </Link>
        </div>
      </div>

      {/* Operational Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
        <div className="flex items-center gap-2 px-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-500 dark:text-slate-400">Register State:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Online & Ready</span>
        </div>
        <div className="flex items-center gap-2 px-2 border-l border-slate-200/60 dark:border-slate-800/60">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-slate-500 dark:text-slate-400">Inventory Guard:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Zero-Negative Active</span>
        </div>
        <div className="flex items-center gap-2 px-2 border-l border-slate-200/60 dark:border-slate-800/60">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-slate-500 dark:text-slate-400">Peak Day:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {peakDay ? `${peakDay.name} (${formatCompactINR(peakDay.revenue)})` : 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-2 px-2 border-l border-slate-200/60 dark:border-slate-800/60">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-500 dark:text-slate-400">Tax Compliance:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Auto GST (18%)</span>
        </div>
      </div>

      {/* Top 5 Primary Sales & Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Today's Walk-in Revenue */}
        <div className="card-interactive p-4 flex flex-col justify-between group bg-gradient-to-br from-emerald-50/60 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 border-emerald-200/70 dark:border-emerald-900/50 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Today's Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <Banknote size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {formatINR(kpis.today_revenue)}
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-emerald-100 dark:border-emerald-900/30 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {kpis.today_orders} {kpis.today_orders === 1 ? 'sale today' : 'sales today'}
              </span>
              <span className="badge-success text-[10px] py-0.5 px-1.5 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Register
              </span>
            </div>
          </div>
        </div>

        {/* Total Walk-in Revenue */}
        <div className="card-interactive p-4 flex flex-col justify-between group shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {formatINR(kpis.total_revenue)}
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {kpis.total_orders} orders recorded
              </span>
              <span className="badge-info text-[10px] py-0.5 px-1.5 font-bold">
                All History
              </span>
            </div>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="card-interactive p-4 flex flex-col justify-between group shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Avg Order Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {formatINR(kpis.aov)}
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {kpis.total_units_sold} units sold
              </span>
              <span className="badge-purple text-[10px] py-0.5 px-1.5 font-bold">
                Per Basket
              </span>
            </div>
          </div>
        </div>

        {/* Total Stock Valuation */}
        <Link 
          to="/inventory" 
          className="card-interactive p-4 flex flex-col justify-between group hover:border-blue-400/60 shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock Valuation
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <Boxes size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {formatINR(data?.stock_value || 0)}
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {data?.total_skus ?? 0} active SKUs
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5 text-[11px]">
                {data?.in_stock_count ?? 0} In Stock <ArrowRight size={10} />
              </span>
            </div>
          </div>
        </Link>

        {/* Replenishment Risk Alerts */}
        <Link 
          to="/inventory" 
          className="card-interactive p-4 flex flex-col justify-between group hover:border-amber-400/60 shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Stock Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <TriangleAlert size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {data?.critical_alert_count ?? 0}
            </div>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {data?.out_of_stock_count ?? 0} Out · {data?.low_stock_count ?? 0} Low
              </span>
              <span className={`text-[10px] py-0.5 px-1.5 font-bold rounded ${
                (data?.critical_alert_count ?? 0) > 0 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}>
                {(data?.critical_alert_count ?? 0) > 0 ? 'Restock Required' : 'Optimal'}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Row 1: Interactive Sales Velocity (AreaChart) + Tender Channels (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Velocity Chart */}
        <div className="lg:col-span-2 card-base p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Walk-in Sales Velocity Trend
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Rolling daily transactions and store counter throughput
                </p>
              </div>
              
              {/* Metric Switcher Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs self-start sm:self-auto">
                <button
                  onClick={() => setTrendMetric('revenue')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    trendMetric === 'revenue' 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Revenue (₹)
                </button>
                <button
                  onClick={() => setTrendMetric('orders')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    trendMetric === 'orders' 
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setTrendMetric('units')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    trendMetric === 'units' 
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Units Sold
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop 
                        offset="5%" 
                        stopColor={trendMetric === 'revenue' ? '#2563EB' : trendMetric === 'orders' ? '#10B981' : '#8B5CF6'} 
                        stopOpacity={0.35}
                      />
                      <stop 
                        offset="95%" 
                        stopColor={trendMetric === 'revenue' ? '#2563EB' : trendMetric === 'orders' ? '#10B981' : '#8B5CF6'} 
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                    dy={8} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11 }} 
                    tickFormatter={(val) => {
                      if (trendMetric === 'revenue') return formatCompactINR(val);
                      return val.toString();
                    }}
                  />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs">
                            <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-4">
                              <span>{pt.full_date || pt.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{pt.day}</span>
                            </p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between gap-5 items-center">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Revenue:
                                </span>
                                <span className="font-mono font-bold text-emerald-400">
                                  {formatINR(pt.revenue)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-5 items-center">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Orders:
                                </span>
                                <span className="font-mono font-bold text-blue-300">
                                  {pt.orders} sales
                                </span>
                              </div>
                              <div className="flex justify-between gap-5 items-center">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Units Sold:
                                </span>
                                <span className="font-mono font-bold text-slate-200">
                                  {pt.units} pcs
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={trendMetric} 
                    stroke={trendMetric === 'revenue' ? '#2563EB' : trendMetric === 'orders' ? '#10B981' : '#8B5CF6'} 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#metricGradient)" 
                    activeDot={{ 
                      r: 6, 
                      fill: trendMetric === 'revenue' ? '#2563EB' : trendMetric === 'orders' ? '#10B981' : '#8B5CF6', 
                      stroke: '#ffffff', 
                      strokeWidth: 2 
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-500" />
              <span>Highest Velocity Day: </span>
              <strong className="text-slate-700 dark:text-slate-300">
                {peakDay ? `${peakDay.name} (${formatINR(peakDay.revenue)})` : 'N/A'}
              </strong>
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Run Rate: {formatINR(kpis.total_revenue / 7)}/day
            </span>
          </div>
        </div>

        {/* Payment Channels Breakdown (Donut PieChart) */}
        <div className="card-base p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Counter Tender Methods
              </h3>
              <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/60">
                {formatINR(totalPaymentValue)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
              Payment mode distribution at checkout
            </p>

            <div className="h-44 relative flex items-center justify-center">
              {paymentDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentDistribution.map((entry) => (
                        <Cell 
                          key={`cell-${entry.name}`} 
                          fill={PAYMENT_COLORS[entry.name] || '#3B82F6'} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val: any) => [formatINR(Number(val)), 'Total Tendered']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-400 text-center py-10">
                  No payment data recorded yet
                </div>
              )}
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tender</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {paymentDistribution.length} modes
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/70">
            {paymentDistribution.map((item) => {
              const color = PAYMENT_COLORS[item.name] || '#3B82F6';
              const percent = totalPaymentValue > 0 ? ((item.value / totalPaymentValue) * 100).toFixed(0) : '0';
              return (
                <div key={item.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {getPaymentIcon(item.name)}
                      {item.name}
                    </span>
                    <span className="text-slate-400 text-[10px]">({item.count} sales)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                    <span>{formatINR(item.value)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Top-Selling Products & Category Revenue Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-Selling Products Ranked with Metric Switcher */}
        <div className="card-base p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Top-Selling Inventory Leaders
                </h3>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                <button
                  onClick={() => setTopProductsMetric('revenue')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    topProductsMetric === 'revenue' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  By Revenue
                </button>
                <button
                  onClick={() => setTopProductsMetric('units')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    topProductsMetric === 'units' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  By Volume
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
              Best performing catalog items sold at the counter
            </p>

            {sortedTopProducts.length > 0 ? (
              <div className="space-y-3.5">
                {sortedTopProducts.map((item, idx) => {
                  const currentValue = topProductsMetric === 'revenue' ? item.revenue : item.units_sold;
                  const percentWidth = Math.min(100, Math.max(12, (currentValue / maxProductMetricValue) * 100));

                  return (
                    <div key={item.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            idx === 0 
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/50' 
                              : idx === 1 
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' 
                              : idx === 2 
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                            {item.sku}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {item.units_sold} pcs
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatINR(item.revenue)}
                          </span>
                        </div>
                      </div>

                      {/* Visual Relative Progress Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No products sold yet. Record your first sale from the POS counter.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70 flex justify-between items-center text-xs text-slate-500">
            <span>Aggregated across all completed counter sales</span>
            <Link to="/inventory" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1">
              Catalog Master <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* Category Revenue Contribution */}
        <div className="card-base p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Category Revenue Performance
                </h3>
              </div>
              <span className="badge-purple text-[10px] py-0.5 px-2">By Department</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
              Revenue and sales volume distributed across departments
            </p>

            {categorySales.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySales} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                    <XAxis 
                      dataKey="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      dy={8}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(val) => formatCompactINR(val)}
                    />
                    <RechartsTooltip 
                      formatter={(val: any) => [formatINR(Number(val)), 'Revenue Generated']}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#10B981" 
                      radius={[6, 6, 0, 0]} 
                      barSize={26}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No category sales records found.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categorySales.map((cat, idx) => (
                <div key={cat.category} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} 
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {cat.category}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(cat.revenue)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {cat.units_sold} units sold
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Live Walk-in Transactions Feed + Replenishment Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Recent Transactions Feed with Search & Filter */}
        <div className="lg:col-span-2 card-base p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Receipt size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Recent Walk-in Counter Transactions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click any sale to preview, print or re-issue customer receipt
                  </p>
                </div>
              </div>

              <Link 
                to="/orders" 
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
              >
                All Sales History <ArrowRight size={13} />
              </Link>
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Filter receipt, customer, items..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                {['ALL', 'Cash', 'UPI', 'Card'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTxPaymentFilter(mode)}
                    className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      txPaymentFilter === mode
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {mode === 'ALL' ? 'All Modes' : mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredTransactions.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2 font-medium">Receipt #</th>
                      <th className="pb-2 font-medium">Customer & Staff</th>
                      <th className="pb-2 font-medium">Cart Summary</th>
                      <th className="pb-2 font-medium">Tender Mode</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                    {filteredTransactions.map((tx) => (
                      <tr 
                        key={tx.id} 
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-2.5 pr-2">
                          <button
                            onClick={() => handleOpenReceipt(tx.id)}
                            className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>{tx.order_number}</span>
                            <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={10} />
                            {tx.created_at ? new Date(tx.created_at).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Just now'}
                          </div>
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {tx.customer_name || 'Walk-in Customer'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Cashier: <span className="font-medium text-slate-700 dark:text-slate-300">{tx.user_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-2 max-w-[200px]">
                          <div className="text-slate-700 dark:text-slate-300 truncate" title={tx.items_summary}>
                            {tx.items_summary || `${tx.items_count} items`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tx.items_count} {tx.items_count === 1 ? 'unit' : 'units'}
                          </div>
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {getPaymentIcon(tx.payment_method)}
                            <span>{tx.payment_method}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          <div>{formatINR(tx.total_amount)}</div>
                          <span className="badge-success text-[9px] py-0 px-1 font-semibold inline-flex items-center gap-0.5">
                            <CheckCircle2 size={9} />
                            {tx.payment_status}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => handleOpenReceipt(tx.id)}
                            disabled={receiptLoadingId === tx.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View & Print Sales Receipt"
                          >
                            {receiptLoadingId === tx.id ? (
                              <RefreshCw size={14} className="animate-spin text-blue-600" />
                            ) : (
                              <Printer size={14} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  {txSearch ? 'No transactions matching your filter.' : 'No counter transactions recorded today yet.'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
            <span>Automated instant stock-deductions synced</span>
            <Link 
              to="/walk-in-order" 
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
            >
              Open Walk-in Register <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Replenishment Alerts & Stock Health */}
        <div className="card-base p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Replenishment Alerts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Items below reorder thresholds
                  </p>
                </div>
              </div>
              <Link 
                to="/inventory" 
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
              >
                Stock <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {lowStockItems.length > 0 ? (
                lowStockItems.slice(0, 4).map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      item.quantity === 0
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                        : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        item.quantity === 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}>
                        {item.quantity === 0 ? <AlertOctagon size={14} /> : <TriangleAlert size={14} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {item.sku}
                          </span>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="text-xs font-bold font-mono">
                        <span className={item.quantity === 0 ? 'text-rose-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                          {item.quantity} {item.unit_of_measurement}
                        </span>
                        <span className="text-slate-400 font-normal text-[10px]"> (min {item.reorder_level})</span>
                      </div>
                      <Link
                        to="/inventory"
                        className="mt-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
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
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Negative stock protection active
            </span>
            <Link to="/inventory" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              View all ({lowStockItems.length})
            </Link>
          </div>
        </div>
      </div>

      {/* POS Receipt & Invoice Modal */}
      <InvoiceModal
        order={selectedOrderForReceipt}
        isOpen={!!selectedOrderForReceipt}
        onClose={() => setSelectedOrderForReceipt(null)}
      />
    </div>
  );
};

export default Dashboard;
