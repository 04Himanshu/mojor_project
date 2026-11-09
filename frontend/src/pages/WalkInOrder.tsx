import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { inventoryApi } from '../services/inventoryApi';
import { orderApi } from '../services/orderApi';
import type { InventoryItem } from '../types/inventory';
import type { Customer, Order, OrderCreatePayload } from '../types/order';
import { InvoiceModal } from '../components/orders/InvoiceModal';
import { PaymentModal } from '../components/orders/PaymentModal';
import {
  Store,
  Search,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Receipt,
  User,
  Package,
  Layers,
  ArrowRight,
  LayoutGrid,
  List,
  Barcode
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

  // Payment & Billing (Cash, UPI, QR, Cards via Cashfree PG)
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QR Code' | 'UPI' | 'Card'>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<string>('Paid');
  const [taxRate, setTaxRate] = useState<number>(0.18);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Processing & Invoicing
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // POS Layout & Productivity State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartListRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    loadInventory();
    loadCustomers();
  }, [loadInventory, loadCustomers]);

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

  // Product counts per category for the filter pills
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: inventoryList.length };
    inventoryList.forEach((item) => {
      if (item.category) {
        map[item.category] = (map[item.category] || 0) + 1;
      }
    });
    return map;
  }, [inventoryList]);

  // Global POS Hotkeys (Press [/] to search, [Esc] to clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === 'Escape' && activeEl === searchInputRef.current) {
        setSearch('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick-add on Enter in search bar (Barcode scan or exact SKU match)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = search.trim().toLowerCase();
      if (!trimmed) return;

      const exactSku = filteredProducts.find((p) => p.sku.toLowerCase() === trimmed);
      if (exactSku) {
        handleAddToCart(exactSku);
        setSearch('');
        return;
      }

      if (filteredProducts.length === 1) {
        handleAddToCart(filteredProducts[0]);
        setSearch('');
      }
    }
  };

  // Add Item to Cart (prepends new items so they always appear at the top of the list)
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
        const updatedItem = {
          ...existing,
          quantity: existing.quantity + 1
        };
        // Bring recently added item to the top
        const remaining = prev.filter((_, idx) => idx !== existingIdx);
        return [updatedItem, ...remaining];
      } else {
        const newItem: CartItem = {
          inventory_id: item.id,
          item_name: item.name,
          item_sku: item.sku,
          unit_price: item.selling_price,
          quantity: 1,
          available_stock: item.quantity,
          unit_of_measurement: item.unit_of_measurement || 'pcs'
        };
        // Prepend new item to the top of the list
        return [newItem, ...prev];
      }
    });

    // Auto-scroll cart container to the top so new item is immediately in view
    setTimeout(() => {
      if (cartListRef.current) {
        cartListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
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

  // Decrement Item in Cart (from catalog card)
  const handleDecrement = (item: InventoryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const inCart = cart.find((c) => c.inventory_id === item.id);
    if (!inCart) return;

    if (inCart.quantity <= 1) {
      handleRemoveFromCart(item.id);
    } else {
      handleUpdateQty(item.id, inCart.quantity - 1);
    }
  };

  // Increment Item in Cart (from catalog card)
  const handleIncrement = (item: InventoryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleAddToCart(item);
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

  // Submit & Checkout Walk-in Sale (called from PaymentModal)
  const handleCompleteSale = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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

      // Auto-open invoice/receipt and close payment modal
      setCompletedOrder(newOrder);
      setIsPaymentModalOpen(false);
      setIsInvoiceOpen(true);

      // Reset cart and reload inventory live to reflect updated quantities
      handleClearCart();
      loadInventory();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to complete counter sale';
      toast.error(typeof detail === 'string' ? detail : JSON.stringify(detail), 'Order Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCashfreeSuccess = (order: Order) => {
    toast.success(`Online payment confirmed! Order ${order.order_number} settled.`, 'Sale Completed');
    setCompletedOrder(order);
    setIsPaymentModalOpen(false);
    setIsInvoiceOpen(true);
    handleClearCart();
    loadInventory();
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/25">
            <Store size={18} />
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Walk-in Order Counter
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadInventory}
            disabled={loadingItems}
            title="Sync inventory records live from database"
            className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
          >
            <RefreshCw size={13} className={loadingItems ? 'animate-spin text-blue-500' : ''} />
            <span>{loadingItems ? 'Syncing...' : 'Sync DB'}</span>
          </button>

          <Link
            to="/orders"
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Receipt size={13} className="text-blue-500" />
            <span>All Sales Orders</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Product Catalog (7 Columns on lg/xl, 8 on 2xl) */}
        <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 space-y-3.5 min-w-0">
          {/* Catalog Command Bar: Search, Category Chips, View Toggle */}
          <div className="card-base p-3 sm:p-3.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Search Bar with Barcode Icon & Quick-Add Enter */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search products by SKU, name, or scan barcode... (Press [/] to focus)"
                  className="input-base pl-9 pr-16 text-xs py-2 w-full font-medium"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  ) : (
                    <span className="hidden sm:inline text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      /
                    </span>
                  )}
                  <Barcode size={15} className="text-slate-400 ml-0.5" />
                </div>
              </div>

              {/* View Toggle & Header Actions */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                {/* Grid / List View Toggle */}
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    title="Grid Card View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    title="Compact Table List View"
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Pills Ribbon */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-xs">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catalog Header & Count Info */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 text-xs">
              <Layers size={13} className="text-blue-500" />
              Catalog Items
              <span className="font-mono font-bold text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                {filteredProducts.length} Available
              </span>
            </span>
          </div>

          {/* Products Content: Loading / Empty / Grid / List */}
          {loadingItems ? (
            <div className="card-base p-16 text-center text-slate-400">
              <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p className="text-xs">Loading store catalog dynamically from DB...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="card-base p-12 text-center text-slate-400">
              <Package size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No matching products found</p>
              <p className="text-[11px] text-slate-400 mt-1">Try clearing search or click "Samples" above to enrich the catalog.</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.map((item) => {
                const isOutOfStock = item.quantity <= 0;
                const inCart = cart.find((c) => c.inventory_id === item.id);
                const isMaxInCart = inCart ? inCart.quantity >= item.quantity : false;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isOutOfStock) return;
                      if (!inCart) handleAddToCart(item);
                    }}
                    className={`card-base p-3.5 flex flex-col justify-between transition-all duration-150 relative group ${
                      isOutOfStock
                        ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed border-dashed'
                        : inCart
                        ? 'border-blue-500/60 dark:border-blue-500/70 shadow-sm bg-blue-50/15 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                        : 'hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Header: SKU & Stock Badge + In-Cart Indicator */}
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] font-bold text-slate-400 truncate">
                            {item.sku}
                          </span>
                          {inCart && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono shrink-0 flex items-center gap-0.5">
                              <ShoppingBag size={10} />
                              {inCart.quantity} in cart
                            </span>
                          )}
                        </div>
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

                      {/* Item Name */}
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {item.name}
                      </h3>

                      {/* Category */}
                      {item.category && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {/* Bottom Footer: Price + Add Button / Count Stepper */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono block">
                          ₹{item.selling_price.toLocaleString('en-IN')}
                        </span>
                        {inCart && isMaxInCart && (
                          <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-tight block">
                            Max stock reached
                          </span>
                        )}
                      </div>

                      {inCart ? (
                        /* Interactive Count Stepper with Add & Minus Button Icons */
                        <div
                          className="flex items-center rounded-lg border border-blue-500/30 bg-blue-50/90 dark:bg-blue-950/80 p-0.5 shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            title={inCart.quantity === 1 ? 'Remove from cart' : 'Decrease count'}
                            onClick={(e) => handleDecrement(item, e)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                          >
                            {inCart.quantity === 1 ? (
                              <Trash2 size={12} className="text-rose-500" />
                            ) : (
                              <Minus size={12} strokeWidth={2.5} />
                            )}
                          </button>
                          <span
                            className="px-2 font-mono font-bold text-xs text-blue-700 dark:text-blue-300 select-none min-w-[1.75rem] text-center"
                            title={`${inCart.quantity} in cart`}
                          >
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            title={isMaxInCart ? `Max stock reached (${item.quantity})` : 'Add one more'}
                            disabled={isMaxInCart}
                            onClick={(e) => handleIncrement(item, e)}
                            className="w-7 h-7 rounded-md flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                          >
                            <Plus size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        /* Add Button with Icon */
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                            isOutOfStock
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-blue-500/20 hover:shadow-blue-500/30 cursor-pointer'
                          }`}
                          title={isOutOfStock ? 'Out of stock' : 'Add to cart'}
                        >
                          <Plus size={13} strokeWidth={2.5} />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Compact List View */
            <div className="card-base overflow-hidden border border-slate-200/90 dark:border-slate-800">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 font-bold">Product / SKU</th>
                      <th className="py-2.5 px-2 font-bold">Category</th>
                      <th className="py-2.5 px-2 font-bold text-center">Stock</th>
                      <th className="py-2.5 px-3 font-bold text-right">Price</th>
                      <th className="py-2.5 px-3 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredProducts.map((item) => {
                      const isOutOfStock = item.quantity <= 0;
                      const inCart = cart.find((c) => c.inventory_id === item.id);
                      const isMaxInCart = inCart ? inCart.quantity >= item.quantity : false;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            if (isOutOfStock) return;
                            if (!inCart) handleAddToCart(item);
                          }}
                          className={`transition-colors ${
                            isOutOfStock
                              ? 'opacity-50 bg-slate-50/30 dark:bg-slate-900/20'
                              : inCart
                              ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/60'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                              {item.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {item.sku}
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider ${
                                isOutOfStock
                                  ? 'badge-danger'
                                  : item.quantity <= item.reorder_level
                                  ? 'badge-warning'
                                  : 'badge-success'
                              }`}
                            >
                              {isOutOfStock ? '0' : `${item.quantity} ${item.unit_of_measurement || 'pcs'}`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                            ₹{item.selling_price.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                              {inCart ? (
                                <div className="flex items-center rounded-lg border border-blue-500/30 bg-blue-50/90 dark:bg-blue-950/80 p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={(e) => handleDecrement(item, e)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-rose-600 dark:text-slate-300 transition-colors"
                                  >
                                    {inCart.quantity === 1 ? <Trash2 size={11} className="text-rose-500" /> : <Minus size={11} />}
                                  </button>
                                  <span className="px-2 font-mono font-bold text-xs text-blue-700 dark:text-blue-300 min-w-[1.5rem] text-center">
                                    {inCart.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isMaxInCart}
                                    onClick={(e) => handleIncrement(item, e)}
                                    className="w-6 h-6 rounded flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 transition-colors"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isOutOfStock}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(item);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs disabled:opacity-40"
                                >
                                  <Plus size={11} />
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sticky Walk-in Counter Cart & Checkout (5 Columns on lg/xl, 4 on 2xl) */}
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 lg:sticky lg:top-2 space-y-2">
          <form
            onSubmit={handleCompleteSale}
            className="card-base p-3 sm:p-3.5 flex flex-col border-slate-200/90 dark:border-slate-800 shadow-md"
          >
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ShoppingBag size={15} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Walk-in Customer Cart
                  </h2>
                  <span className="text-[10px] text-slate-400">
                    {cart.reduce((a, b) => a + b.quantity, 0)} units in queue
                  </span>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Scrollable Cart Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 py-2 space-y-2.5 min-h-0">
              {/* Customer Details Toggle */}
              <div className="bg-slate-50/80 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <User size={11} className="text-blue-500" />
                    Customer Mode
                  </span>

                  <div className="inline-flex rounded-md bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerMode('walkin');
                        setSelectedCustomerId('');
                      }}
                      className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                        customerMode === 'walkin'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
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
                      className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                        customerMode === 'registered'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Member
                    </button>
                  </div>
                </div>

                {customerMode === 'walkin' ? (
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Name (Optional)"
                      className="input-base text-xs py-1 px-2"
                    />
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Mobile (+91...)"
                      className="input-base text-xs font-mono py-1 px-2"
                    />
                  </div>
                ) : (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectMember(Number(e.target.value))}
                    className="select-base text-xs py-1 px-2"
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

              {/* Cart Line Items */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Purchased Items ({cart.length})
                </span>

                {cart.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
                    <ShoppingBag size={20} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                    <p className="text-xs font-medium">Cart is currently empty</p>
                    <p className="text-[10px] text-slate-400">Click products from the catalog to add items</p>
                  </div>
                ) : (
                  <div
                    ref={cartListRef}
                    className="space-y-1.5 max-h-36 sm:max-h-40 overflow-y-auto custom-scrollbar pr-0.5"
                  >
                    {cart.map((item) => {
                      const lineTotal = item.quantity * item.unit_price;
                      return (
                        <div
                          key={item.inventory_id}
                          className="p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 flex items-center justify-between gap-2 text-xs shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 dark:text-white truncate text-xs leading-tight">
                              {item.item_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <span className="text-slate-500 dark:text-slate-400">{item.item_sku}</span>
                              <span>•</span>
                              <span>₹{item.unit_price.toLocaleString('en-IN')} × {item.quantity}</span>
                              <span>=</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">₹{lineTotal.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5 shadow-2xs shrink-0">
                            <button
                              type="button"
                              title={item.quantity === 1 ? 'Remove from cart' : 'Decrease count'}
                              onClick={() => handleUpdateQty(item.inventory_id, item.quantity - 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                            >
                              <Minus size={11} strokeWidth={2.5} />
                            </button>
                            <span className="px-1.5 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 select-none min-w-[1.25rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              title={item.quantity >= item.available_stock ? 'Stock limit reached' : 'Add one more'}
                              onClick={() => handleUpdateQty(item.inventory_id, item.quantity + 1)}
                              disabled={item.quantity >= item.available_stock}
                              className="w-5 h-5 rounded flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            title="Remove item"
                            onClick={() => handleRemoveFromCart(item.inventory_id)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Anchored: Financial Summary & Submit CTA */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0 mt-1">
              {/* Financial Breakdown */}
              <div className="bg-slate-50/90 dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">GST Rate:</span>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="select-base w-28 py-0.5 text-xs font-mono"
                  >
                    <option value={0}>0% Tax Free</option>
                    <option value={0.05}>5% GST (₹{(subtotal * 0.05).toFixed(0)})</option>
                    <option value={0.12}>12% GST (₹{(subtotal * 0.12).toFixed(0)})</option>
                    <option value={0.18}>18% GST (₹{(subtotal * 0.18).toFixed(0)})</option>
                    <option value={0.28}>28% GST (₹{(subtotal * 0.28).toFixed(0)})</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Discount:</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="input-base w-full py-0.5 text-right font-mono text-xs pl-5"
                    />
                  </div>
                </div>

                {/* Grand Total Banner */}
                <div className="pt-1.5 mt-0.5 border-t border-slate-200 dark:border-slate-700/80 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Total Due</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{cart.reduce((a, b) => a + b.quantity, 0)} units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight block">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proceed to Pay Button */}
              <button
                type="button"
                onClick={() => {
                  if (cart.length === 0) {
                    toast.warning('Cart is empty. Please select products for the customer.', 'Empty Cart');
                    return;
                  }
                  setIsPaymentModalOpen(true);
                }}
                disabled={cart.length === 0}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <span>Proceed to Pay</span>
                <ArrowRight size={15} />
              </button>
            </div>
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

      {/* Payment & Settlement Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onCompleteSale={handleCompleteSale}
        onCashfreeSuccess={handleCashfreeSuccess}
        submitting={submitting}
        grandTotal={grandTotal}
        subtotal={subtotal}
        taxAmount={taxAmount}
        taxRate={taxRate}
        discountAmount={discountAmount}
        cart={cart}
        customerName={customerName}
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        customerMode={customerMode}
        selectedCustomerId={selectedCustomerId}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        cashTendered={cashTendered}
        setCashTendered={setCashTendered}
        paymentStatus={paymentStatus}
        setPaymentStatus={setPaymentStatus}
        notes={notes}
        setNotes={setNotes}
      />
    </div>
  );
};

export default WalkInOrder;
