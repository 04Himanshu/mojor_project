export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  gstin: string | null;
  payment_terms: string;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  rating: number;
  notes: string | null;
  is_active: boolean;
  total_orders: number;
  total_spend: number;
  open_orders: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreatePayload {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  gstin?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  rating?: number;
  notes?: string;
  is_active?: boolean;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  inventory_id: number;
  item_name?: string;
  item_sku?: string;
  unit_of_measurement?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  pending_quantity: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  supplier_contact: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  supplier_gstin: string | null;
  user_id: number | null;
  user_name: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: 'Draft' | 'Issued' | 'Partially Received' | 'Received' | 'Cancelled';
  payment_status: 'Unpaid' | 'Partially Paid' | 'Paid';
  payment_terms: string;
  notes: string | null;
  shipping_address: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItemCreatePayload {
  inventory_id: number;
  quantity_ordered: number;
  unit_cost: number;
}

export interface PurchaseOrderCreatePayload {
  supplier_id: number;
  order_date?: string;
  expected_delivery_date?: string;
  status?: string;
  payment_status?: string;
  payment_terms?: string;
  notes?: string;
  shipping_address?: string;
  tax_rate?: number;
  shipping_cost?: number;
  items: PurchaseOrderItemCreatePayload[];
}

export interface GoodsReceiptItem {
  id: number;
  purchase_order_item_id: number;
  inventory_id: number;
  item_name: string;
  item_sku: string;
  unit_of_measurement: string;
  quantity_received: number;
  unit_cost: number;
  batch_lot_number: string | null;
  condition_notes: string;
}

export interface GoodsReceipt {
  id: number;
  grn_number: string;
  purchase_order_id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  received_by: string;
  received_date: string;
  carrier: string | null;
  tracking_number: string | null;
  delivery_challan_number: string | null;
  notes: string | null;
  created_at: string;
  items: GoodsReceiptItem[];
}

export interface GoodsReceiptItemCreatePayload {
  purchase_order_item_id: number;
  quantity_received: number;
  batch_lot_number?: string;
  condition_notes?: string;
}

export interface GoodsReceiptCreatePayload {
  purchase_order_id: number;
  received_by?: string;
  carrier?: string;
  tracking_number?: string;
  delivery_challan_number?: string;
  notes?: string;
  items: GoodsReceiptItemCreatePayload[];
}

export interface ProcurementStats {
  total_procurement_spend: number;
  active_suppliers_count: number;
  open_po_count: number;
  goods_received_count: number;
  items_inwarded_total: number;
}
