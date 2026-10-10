
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
  Cell,
  Legend
} from 'recharts';
import { TriangleAlert, Wallet, ShoppingBag, Package, ShieldAlert } from 'lucide-react';

const dataChart = [
  { name: 'Dec', revenue: 0, cost: 0, profit: 0 },
  { name: 'Jan', revenue: 0, cost: 0, profit: 0 },
  { name: 'Feb', revenue: 0, cost: 0, profit: 0 },
  { name: 'Mar', revenue: 15000, cost: 20000, profit: -5000 },
  { name: 'Apr', revenue: 25000, cost: 10000, profit: 15000 },
  { name: 'May', revenue: 0, cost: 0, profit: 0 },
];

const dataPie = [
  { name: 'Stationery', value: 87 },
  { name: 'Electronics', value: 53 },
  { name: 'Furniture', value: 26 },
];
const COLORS = ['#2563eb', '#d97706', '#0d9488'];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 font-medium mt-1">
            <span>Live overview · 19 May 2026 · All warehouses</span>
            <span className="mx-2">·</span>
            <span className="text-amber-600 font-semibold flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-amber-50 dark:bg-amber-900/300"></span> Offline Mode
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-xl border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-medium mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Value</span>
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 p-2.5 rounded-xl">
               <Wallet size={22} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">₹3.4L</h2>
            <div className="flex justify-between items-end mt-2">
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">10 SKUs</span>
              <span className="text-sm font-medium text-blue-600 flex items-center gap-1">↑ Live</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-xl border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-medium mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Sales</span>
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 p-2.5 rounded-xl">
               <ShoppingBag size={22} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">2</h2>
            <div className="flex justify-between items-end mt-2">
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">need dispatch</span>
              <span className="text-sm font-medium text-red-500 flex items-center gap-1">↓ Live</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-xl border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-medium mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Inward</span>
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 p-2.5 rounded-xl">
               <Package size={22} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">2</h2>
            <div className="flex justify-between items-end mt-2">
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">purchase orders</span>
              <span className="text-sm font-medium text-blue-600 flex items-center gap-1">↑ Live</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-xl border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-medium mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-500">Stock Alerts</span>
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 p-2.5 rounded-xl">
               <TriangleAlert size={22} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">6</h2>
            <div className="flex justify-between items-end mt-2">
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">low / critical</span>
              <span className="text-sm font-medium text-red-600 flex items-center gap-1">:urgent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] p-6 rounded-xl border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Revenue · Cost · Profit</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Last 6 Months · ₹000s</p>
            </div>
            <div className="flex gap-4 text-sm font-medium">
              <span className="flex items-center gap-1 text-blue-600"><span className="w-3 h-1 bg-blue-600 rounded"></span> Revenue</span>
              <span className="flex items-center gap-1 text-red-500"><span className="w-3 h-1 bg-red-500 rounded"></span> Cost</span>
              <span className="flex items-center gap-1 text-slate-800 dark:text-slate-300"><span className="w-3 h-1 bg-slate-800 dark:bg-slate-300 rounded"></span> Profit</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataChart} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-xl border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Stock by Category</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-4">Total units on hand</p>
          <div className="h-48 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
             {dataPie.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[index] }}></span>
                     <span className="font-medium text-gray-700 dark:text-slate-300">{item.name}</span>
                   </div>
                   <span className="font-semibold text-slate-800 dark:text-slate-100">{item.value}</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] rounded-xl border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Recent Orders</h3>
            <a href="#" className="text-sm text-blue-600 font-medium hover:underline">View all →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-5 py-3 font-semibold text-blue-700">SO-1042</td>
                  <td className="px-5 py-3 text-gray-700 dark:text-slate-300">Agrolait</td>
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">₹24,000</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 rounded text-xs font-semibold border border-blue-100 dark:border-blue-900/50">
                      Done
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-5 py-3 font-semibold text-blue-700">SO-1043</td>
                  <td className="px-5 py-3 text-gray-700 dark:text-slate-300">Deco Addict</td>
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">₹70,000</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 rounded text-xs font-semibold border border-amber-100 dark:border-amber-900/50">
                      Pending
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 p-5">
           <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
              <ShieldAlert className="text-blue-600" size={18} />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">System Alerts</h3>
           </div>
           
           <div className="space-y-3">
             <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 p-3 rounded-md">
               <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                 <TriangleAlert size={14} className="text-red-500" /> 
                 Critical Stock-out Risk
               </h4>
               <p className="text-xs text-slate-600 dark:text-slate-400">Large Desk (FCH-002) has 0 stock available. Reorder immediately.</p>
             </div>
             <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 p-3 rounded-md">
               <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                 <TriangleAlert size={14} className="text-red-500" /> 
                 Critical Stock-out Risk
               </h4>
               <p className="text-xs text-slate-600 dark:text-slate-400">Flipper Board (FCH-003) has 0 stock available. Reorder immediately.</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
