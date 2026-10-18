export type OrderStatus = 'Pending' | 'Confirmed' | 'Dispatched' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Unpaid' | 'Paid' | 'Partially Paid' | 'Refunded';
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'UPI' | 'Credit Net 30';

export interface OrderItem {
  id: number;
  inventory_id: number;
  quantity: number;
  price_at_time: number;
  item_name?: string;
  item_sku?: string;
  unit_of_measurement?: string;
  subtotal: number;
}

export interface OrderItemCreate {
  inventory_id: number;
  quantity: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id?: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  user_id?: number;
  user_name: string;
  created_at: string;
  status: OrderStatus;
  stock_deducted: boolean;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  notes?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  items: OrderItem[];
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  pending_count: number;
  confirmed_count: number;
  dispatched_count: number;
  delivered_count: number;
  cancelled_count: number;
}

export interface OrderCreatePayload {
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  payment_status?: string;
  payment_method?: string;
  notes?: string;
  tax_rate?: number;
  discount_amount?: number;
  items: OrderItemCreate[];
}

export interface OrderStatusUpdatePayload {
  status: OrderStatus;
  payment_status?: string;
  notes?: string;
}

export interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  order_id: number;
  order_number: string;
  order_date: string;
  company_name: string;
  company_address: string;
  company_email: string;
  company_phone: string;
  company_gstin: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
}
