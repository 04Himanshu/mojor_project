import { apiClient } from './apiClient';
import type {
  Supplier,
  SupplierCreatePayload,
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  GoodsReceipt,
  GoodsReceiptCreatePayload,
  ProcurementStats
} from '../types/procurement';


export const procurementApi = {
  // Statistics
  getStats: async (): Promise<ProcurementStats> => {
    const res = await apiClient.get<ProcurementStats>('/procurement/stats');
    return res.data;
  },

  // Suppliers
  getSuppliers: async (params?: { search?: string; is_active?: boolean }): Promise<Supplier[]> => {
    const res = await apiClient.get<Supplier[]>('/procurement/suppliers', { params });
    return res.data;
  },

  getSupplierById: async (id: number): Promise<Supplier> => {
    const res = await apiClient.get<Supplier>(`/procurement/suppliers/${id}`);
    return res.data;
  },

  createSupplier: async (payload: SupplierCreatePayload): Promise<Supplier> => {
    const res = await apiClient.post<Supplier>('/procurement/suppliers', payload);
    return res.data;
  },

  updateSupplier: async (id: number, payload: Partial<SupplierCreatePayload>): Promise<Supplier> => {
    const res = await apiClient.put<Supplier>(`/procurement/suppliers/${id}`, payload);
    return res.data;
  },

  deleteSupplier: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/procurement/suppliers/${id}`);
    return res.data;
  },

  // Purchase Orders
  getPurchaseOrders: async (params?: {
    status?: string;
    supplier_id?: number;
    payment_status?: string;
    search?: string;
  }): Promise<PurchaseOrder[]> => {
    const res = await apiClient.get<PurchaseOrder[]>('/procurement/purchase-orders', { params });
    return res.data;
  },

  getPurchaseOrderById: async (id: number): Promise<PurchaseOrder> => {
    const res = await apiClient.get<PurchaseOrder>(`/procurement/purchase-orders/${id}`);
    return res.data;
  },

  createPurchaseOrder: async (payload: PurchaseOrderCreatePayload): Promise<PurchaseOrder> => {
    const res = await apiClient.post<PurchaseOrder>('/procurement/purchase-orders', payload);
    return res.data;
  },

  updatePOStatus: async (
    id: number,
    payload: { status?: string; payment_status?: string; notes?: string }
  ): Promise<PurchaseOrder> => {
    const res = await apiClient.patch<PurchaseOrder>(`/procurement/purchase-orders/${id}/status`, payload);
    return res.data;
  },

  // Goods Receipts (GRN)
  getGoodsReceipts: async (params?: { po_id?: number; supplier_id?: number }): Promise<GoodsReceipt[]> => {
    const res = await apiClient.get<GoodsReceipt[]>('/procurement/goods-receipts', { params });
    return res.data;
  },

  receiveGoods: async (payload: GoodsReceiptCreatePayload): Promise<GoodsReceipt> => {
    const res = await apiClient.post<GoodsReceipt>('/procurement/goods-receipts', payload);
    return res.data;
  },
};
