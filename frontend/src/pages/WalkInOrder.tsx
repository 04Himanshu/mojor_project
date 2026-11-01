import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { inventoryApi } from '../services/inventoryApi';
import { orderApi } from '../services/orderApi';
import type { InventoryItem } from '../types/inventory';
import type { Customer, Order, OrderCreatePayload, OrderStats } from '../types/order';
import { InvoiceModal } from '../components/orders/InvoiceModal';
import {
  Store,
  Search,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  User,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CartItem {
  inventory_id: number;
  item_name: string;
  item_sku: string;
  unit_price: number;
  quantity: number;
  available_stock: number;
  unit_of_measurement: string;
}

export const WalkInOrder: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Inventory & Customers from DB
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Active Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer Mode & Details
  const [customerMode, setCustomerMode] = useState<'walkin' | 'registered'>('walkin');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Payment & Billing
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<string>('Paid');
  const [taxRate, setTaxRate] = useState<number>(0.18);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Processing & Invoicing
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);

  // Load Inventory dynamically from DB
  const loadInventory = useCallback(async () => {
    setLoadingItems(true);
    try {
      const items = await inventoryApi.getLookupItems();
      const active = (items || []).filter((i) => i.is_active);
      setInventoryList(active);
    } catch (err) {
      console.error('Failed to load store inventory from DB', err);
      toast.error('Failed to sync inventory from database. Check backend connection.', 'DB Sync Error');
    } finally {
      setLoadingItems(false);
    }
  }, [toast]);

  // Load registered customers independently
  const loadCustomers = useCallback(async () => {
    try {
      const data = await orderApi.getCustomers();
      setCustomers(data || []);
    } catch (err) {
      console.warn('Customer list not loaded', err);
    }
  }, []);

  // Load POS Shift KPIs
  const loadOrderStats = useCallback(async () => {
    try {
      const stats = await orderApi.getOrderStats();
      setOrderStats(stats);
    } catch (err) {
      console.warn('Shift stats not loaded', err);
    }
  }, []);

  useEffect(() => {
    loadInventory();
    loadCustomers();
    loadOrderStats();
  }, [loadInventory, loadCustomers, loadOrderStats]);

  // Unique categories derived dynamically from DB items
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventoryList.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [inventoryList]);

  // Filtered catalog items
  const filteredProducts = useMemo(() => {
    return inventoryList.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const s = search.trim().toLowerCase();
      const matchesSearch =
        !s ||
        item.name.toLowerCase().includes(s) ||
        item.sku.toLowerCase().includes(s) ||
        (item.category && item.category.toLowerCase().includes(s));
      return matchesCategory && matchesSearch;
    });
  }, [inventoryList, selectedCategory, search]);

  // Add Item to Cart
  const handleAddToCart = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      toast.warning(`'${item.name}' is currently out of stock.`, 'Out of Stock');
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.inventory_id === item.id);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        if (existing.quantity >= item.quantity) {
          toast.warning(`Cannot add more. Only ${item.quantity} units available in stock.`, 'Stock Limit');
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = {
          ...existing,
          quantity: existing.quantity + 1
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            inventory_id: item.id,
            item_name: item.name,
            item_sku: item.sku,
            unit_price: item.selling_price,
            quantity: 1,
            available_stock: item.quantity,
            unit_of_measurement: item.unit_of_measurement || 'pcs'
          }
        ];
      }
    });
  };

  // Modify Cart Item Quantity
  const handleUpdateQty = (invId: number, qty: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.inventory_id === invId) {
            const clamped = Math.max(1, Math.min(qty, c.available_stock));
            return { ...c, quantity: clamped };
          }
          return c;
        })
        .filter((c) => c.quantity > 0)
    );
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (invId: number) => {
    setCart((prev) => prev.filter((c) => c.inventory_id !== invId));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
    setCashTendered('');
    setNotes('');
  };

  // Registered customer selection
  const handleSelectMember = (custId: number) => {
    setSelectedCustomerId(custId);
    const member = customers.find((c) => c.id === custId);
    if (member) {
      setCustomerName(member.name);
      setCustomerPhone(member.phone || '');
      setCustomerEmail(member.email || '');
    }
  };

  // Financial calculations
  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const grandTotal = Math.max(0, Math.round((subtotal + taxAmount - discountAmount) * 100) / 100);

  // Cash change
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, Math.round((tenderedNum - grandTotal) * 100) / 100);

  // Submit & Checkout Walk-in Sale
  const handleCompleteSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.warning('Cart is empty. Please select products for the customer.', 'Empty Cart');
      return;
    }

    // Verify stock availability
    const overStockItem = cart.find((i) => i.quantity > i.available_stock);
    if (overStockItem) {
      toast.error(`Quantity for '${overStockItem.item_name}' exceeds available stock (${overStockItem.available_stock}).`, 'Stock Insufficient');
      return;
    }

    setSubmitting(true);
    try {
      const finalCustName = customerMode === 'registered'
        ? customerName
        : (customerName.trim() || 'Walk-in Customer');

      const payload: OrderCreatePayload = {
        customer_id: customerMode === 'registered' && selectedCustomerId ? Number(selectedCustomerId) : undefined,
        customer_name: finalCustName,
        customer_phone: customerPhone.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        shipping_address: 'In-Store Counter Handover',
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        tax_rate: taxRate,
        discount_amount: Number(discountAmount) || 0,
        notes: notes.trim() || 'Walk-in counter sale',
        items: cart.map((i) => ({
          inventory_id: i.inventory_id,
          quantity: i.quantity
        }))
      };

      const newOrder = await orderApi.createOrder(payload);
      toast.success(`Walk-in order ${newOrder.order_number} processed! Stock deducted from DB.`, 'Sale Completed');

      // Auto-open invoice/receipt
      setCompletedOrder(newOrder);
      setIsInvoiceOpen(true);

      // Reset cart and reload inventory live to reflect updated quantities
      handleClearCart();
      loadInventory();
      loadOrderStats();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to complete counter sale';
      toast.error(typeof detail === 'string' ? detail : JSON.stringify(detail), 'Order Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Store className="text-blue-600 dark:text-blue-400" size={26} />
              <span>Walk-in Order Counter (POS)</span>
            </h1>
            <span className="badge-purple text-[10px] py-0.5 px-2 font-mono">
              Live Counter
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cashier: <strong className="text-slate-700 dark:text-slate-300">{user?.name || 'Staff Member'}</strong> • Select items for walk-in customer, process payment, and issue receipts
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadInventory}
            disabled={loadingItems}
            title="Reload items live from database"
            className="btn-secondary text-xs"
          >
            <RefreshCw size={13} className={loadingItems ? 'animate-spin text-blue-500' : ''} />
            <span>{loadingItems ? 'Syncing DB...' : 'Sync DB Inventory'}</span>
          </button>

          <Link
            to="/orders"
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Receipt size={14} className="text-blue-500" />
            <span>All Sales Orders</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* POS Shift Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Shift Revenue Collected */}
        <div className="card-base p-4 flex flex-col justify-between group hover:border-emerald-300 dark:hover:border-emerald-800 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Today's POS Intake
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Banknote size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              ₹{Math.round(orderStats?.today_revenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px]">
              <span className="text-slate-500">{orderStats?.today_orders || 0} sales closed</span>
              <span className="badge-success text-[10px] py-0 px-1.5 font-bold">Shift Total</span>
            </div>
          </div>
        </div>

        {/* Counter Checkouts */}
        <div className="card-base p-4 flex flex-col justify-between group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Counter Checkouts
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Store size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {orderStats?.today_orders || 0}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px]">
              <span className="text-slate-500">Instant stock sync</span>
              <span className="badge-purple text-[10px] py-0 px-1.5 font-bold">Walk-in</span>
            </div>
          </div>
        </div>

        {/* Shift AOV */}
        <div className="card-base p-4 flex flex-col justify-between group hover:border-purple-300 dark:hover:border-purple-800 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Shift Avg Basket
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              ₹{Math.round(orderStats?.today_aov || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px]">
              <span className="text-slate-500">Per customer checkout</span>
              <span className="badge-purple text-[10px] py-0 px-1.5 font-bold">AOV</span>
            </div>
          </div>
        </div>

        {/* Catalog In-Stock */}
        <div className="card-base p-4 flex flex-col justify-between group hover:border-blue-300 dark:hover:border-blue-800 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Available to Sell
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {inventoryList.filter(i => i.quantity > 0).length} SKUs
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px]">
              <span className="text-slate-500">{inventoryList.filter(i => i.quantity === 0).length} stockouts</span>
              <span className="badge-info text-[10px] py-0 px-1.5 font-bold">Live Catalog</span>
            </div>
          </div>
        </div>

        {/* Active Register Cart */}
        <div className="card-base p-4 flex flex-col justify-between group hover:border-amber-300 dark:hover:border-amber-800 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Active Cart Queue
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {cart.length} {cart.length === 1 ? 'Product' : 'Products'}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px]">
              <span className="text-slate-500">{cart.reduce((a, b) => a + b.quantity, 0)} units in cart</span>
              <span className={`text-[10px] py-0 px-1.5 font-bold rounded ${
                cart.length > 0 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {cart.length > 0 ? 'Billing' : 'Idle'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Catalog (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter Toolbar */}
          <div className="card-base p-4 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name, SKU, or category..."
                className="input-base pl-9 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-blue-500" />
                Store Catalog ({filteredProducts.length} items available)
              </span>
              <span className="text-[11px] text-slate-400">
                Click any item to add to customer cart
              </span>
            </div>

            {loadingItems ? (
              <div className="card-base p-16 text-center text-slate-400">
                <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-2" />
                <p className="text-xs">Loading store catalog dynamically from DB...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="card-base p-12 text-center text-slate-400">
                <Package size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No matching products found</p>
                <p className="text-[11px] text-slate-400 mt-1">Try clearing search or category filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map((item) => {
                  const isOutOfStock = item.quantity <= 0;
                  const inCart = cart.find((c) => c.inventory_id === item.id);
                  const isMaxInCart = inCart && inCart.quantity >= item.quantity;

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && !isMaxInCart && handleAddToCart(item)}
                      className={`card-base p-3.5 flex flex-col justify-between transition-all duration-150 relative group ${
                        isOutOfStock
                          ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed border-dashed'
                          : isMaxInCart
                          ? 'border-blue-400/50 bg-blue-50/20 dark:bg-blue-950/20 cursor-default'
                          : 'hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-400 truncate">
                            {item.sku}
                          </span>
                          <span
                            className={`text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                              isOutOfStock
                                ? 'badge-danger'
                                : item.quantity <= item.reorder_level
                                ? 'badge-warning'
                                : 'badge-success'
                            }`}
                          >
                            {isOutOfStock ? '0 in stock' : `${item.quantity} ${item.unit_of_measurement || 'pcs'}`}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {item.name}
                        </h3>

                        {item.category && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {item.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                          ₹{item.selling_price.toLocaleString('en-IN')}
                        </span>

                        {inCart ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-mono">
                            {inCart.quantity} in cart
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Walk-in Counter Cart & Checkout (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleCompleteSale} className="card-base p-5 space-y-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ShoppingBag size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Walk-in Customer Cart
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    {cart.reduce((a, b) => a + b.quantity, 0)} total units
                  </span>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Details Toggle */}
            <div className="bg-slate-50/80 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={12} className="text-blue-500" />
                  Customer
                </span>

                <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('walkin');
                      setSelectedCustomerId('');
                    }}
                    className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      customerMode === 'walkin'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Walk-in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('registered');
                      if (customers.length > 0 && !selectedCustomerId) {
                        handleSelectMember(customers[0].id);
                      }
                    }}
                    className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      customerMode === 'registered'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Member
                  </button>
                </div>
              </div>

              {customerMode === 'walkin' ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="input-base text-xs py-1.5"
                  />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Mobile (+91...)"
                    className="input-base text-xs font-mono py-1.5"
                  />
                </div>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectMember(Number(e.target.value))}
                  className="select-base text-xs py-1.5"
                >
                  <option value="">-- Choose Member --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Purchased Items ({cart.length})
              </span>

              {cart.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400">
                  <ShoppingBag size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="text-xs font-medium">Cart is currently empty</p>
                  <p className="text-[11px] text-slate-400">Click products from the catalog to add items</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {cart.map((item) => {
                    const lineTotal = item.quantity * item.unit_price;
                    return (
                      <div
                        key={item.inventory_id}
                        className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {item.item_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ₹{item.unit_price.toLocaleString('en-IN')} × {item.quantity} = ₹{lineTotal.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.inventory_id, item.quantity - 1)}
                            className="p-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 font-mono font-bold text-xs select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.inventory_id, item.quantity + 1)}
                            disabled={item.quantity >= item.available_stock}
                            className="p-1 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.inventory_id)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Payment Collection
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'Cash', label: 'Cash', icon: <Banknote size={13} /> },
                  { id: 'Card', label: 'Card', icon: <CreditCard size={13} /> },
                  { id: 'UPI', label: 'UPI / QR', icon: <Smartphone size={13} /> },
                  { id: 'Bank Transfer', label: 'Transfer', icon: <Receipt size={13} /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 border cursor-pointer transition-all ${
                      paymentMethod === m.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Cash change calculator */}
              {paymentMethod === 'Cash' && cart.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Cash Tendered:</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        placeholder="0.00"
                        className="input-base text-right font-mono text-xs pl-5 py-0.5"
                      />
                    </div>
                  </div>
                  {tenderedNum > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-semibold">
                      <span className="text-slate-500">Change Due:</span>
                      <span className={`font-mono ${tenderedNum >= grandTotal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        ₹{changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Status & Quick Note */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="select-base text-xs py-1"
                  >
                    <option value="Paid">Paid in Full</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid / On Account</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                    Sale Note
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Counter #1"
                    className="input-base text-xs py-1"
                  />
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50/80 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">GST:</span>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="select-base w-32 py-0.5 text-xs"
                >
                  <option value={0}>0% Tax Free</option>
                  <option value={0.05}>5% GST</option>
                  <option value={0.12}>12% GST</option>
                  <option value={0.18}>18% Standard</option>
                  <option value={0.28}>28% High</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Discount:</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="input-base w-24 py-0.5 text-right font-mono text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                <span>Amount to Collect:</span>
                <span className="text-blue-600 dark:text-blue-400 text-base font-mono font-bold">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Counter Sale...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Complete Sale & Deduct Stock</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Invoice / Printable Receipt Modal */}
      <InvoiceModal
        order={completedOrder}
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setCompletedOrder(null);
        }}
      />
    </div>
  );
};

export default WalkInOrder;
