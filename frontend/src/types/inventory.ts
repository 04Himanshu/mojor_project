export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Inactive';

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit_of_measurement: string;
  cost_price: number;
  selling_price: number;
  unit_price: number;
  quantity: number;
  reorder_level: number;
  is_active: boolean;
  stock_value: number;
  status: StockStatus;
  created_at: string;
  updated_at?: string;
}

export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

export interface StockMovement {
  id: number;
  inventory_id: number;
  item_name?: string;
  item_sku?: string;
  transaction_type: TransactionType;
  quantity: number;
  previous_quantity: number;
  resulting_quantity: number;
  reason: string;
  reference_order?: string;
  user_name: string;
  created_at: string;
}

export interface PaginatedInventoryResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedMovementsResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface InventoryStats {
  total_skus: number;
  total_stock_value: number;
  total_units?: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  inactive_count: number;
  categories: string[];
}

export interface CreateItemPayload {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit_of_measurement: string;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  initial_quantity: number;
  is_active: boolean;
}

export interface UpdateItemPayload {
  name?: string;
  description?: string;
  category?: string;
  unit_of_measurement?: string;
  cost_price?: number;
  selling_price?: number;
  reorder_level?: number;
  is_active?: boolean;
}

export interface StockInPayload {
  quantity: number;
  reason: string;
  reference_order?: string;
  user_name?: string;
}

export interface StockOutPayload {
  quantity: number;
  reason: string;
  reference_order?: string;
  user_name?: string;
}

export interface StockAdjustmentPayload {
  new_quantity: number;
  reason: string;
  reference_order?: string;
  user_name?: string;
}

export interface SalesKPIs {
  today_revenue: number;
  today_orders: number;
  total_revenue: number;
  total_orders: number;
  aov: number;
  total_units_sold: number;
}

export interface SalesTrendPoint {
  name: string;
  day: string;
  full_date: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface TopProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  units_sold: number;
  revenue: number;
}

export interface PaymentDistributionItem {
  name: string;
  count: number;
  value: number;
}

export interface CategorySalesItem {
  category: string;
  units_sold: number;
  revenue: number;
}

export interface RecentTransaction {
  id: number;
  order_number: string;
  customer_name: string;
  user_name: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  items_count: number;
  items_summary: string;
}

export interface DashboardAnalytics {
  sales_kpis: SalesKPIs;
  stock_value: number;
  total_skus: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  critical_alert_count: number;
  sales_trend: SalesTrendPoint[];
  top_products: TopProduct[];
  payment_distribution: PaymentDistributionItem[];
  category_sales: CategorySalesItem[];
  category_distribution: { name: string; value: number }[];
  recent_transactions: RecentTransaction[];
  replenishment_alerts: InventoryItem[];
}

