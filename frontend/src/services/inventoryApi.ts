import { apiClient } from './apiClient';
import type {
  InventoryItem,
  PaginatedInventoryResponse,
  PaginatedMovementsResponse,
  InventoryStats,
  CreateItemPayload,
  UpdateItemPayload,
  StockInPayload,
  StockOutPayload,
  StockAdjustmentPayload,
  StockMovement
} from '../types/inventory';


export const inventoryApi = {
  // 1. Inventory List
  getItems: async (params?: {
    search?: string;
    category?: string;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    page_size?: number;
  }): Promise<PaginatedInventoryResponse> => {
    const res = await apiClient.get<PaginatedInventoryResponse>('/inventory/', { params });
    return res.data;
  },

  getItemById: async (id: number): Promise<InventoryItem> => {
    const res = await apiClient.get<InventoryItem>(`/inventory/${id}`);
    return res.data;
  },

  getStats: async (): Promise<InventoryStats> => {
    const res = await apiClient.get<InventoryStats>('/inventory/stats');
    return res.data;
  },

  getCategories: async (): Promise<string[]> => {
    const res = await apiClient.get<string[]>('/inventory/categories');
    return res.data;
  },

  getLowStockAlerts: async (): Promise<InventoryItem[]> => {
    const res = await apiClient.get<InventoryItem[]>('/inventory/alerts/low-stock');
    return res.data;
  },

  // 2. Add and Edit Inventory Items
  createItem: async (data: CreateItemPayload): Promise<InventoryItem> => {
    const res = await apiClient.post<InventoryItem>('/inventory/', data);
    return res.data;
  },

  updateItem: async (id: number, data: UpdateItemPayload): Promise<InventoryItem> => {
    const res = await apiClient.put<InventoryItem>(`/inventory/${id}`, data);
    return res.data;
  },

  deleteItem: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/inventory/${id}`);
    return res.data;
  },

  // 3. Stock In / Stock Out / Adjustment
  stockIn: async (id: number, data: StockInPayload): Promise<{ item: InventoryItem; movement: StockMovement }> => {
    const res = await apiClient.post(`/inventory/${id}/stock-in`, data);
    return res.data;
  },

  stockOut: async (id: number, data: StockOutPayload): Promise<{ item: InventoryItem; movement: StockMovement }> => {
    const res = await apiClient.post(`/inventory/${id}/stock-out`, data);
    return res.data;
  },

  stockAdjustment: async (id: number, data: StockAdjustmentPayload): Promise<{ item: InventoryItem; movement: StockMovement }> => {
    const res = await apiClient.post(`/inventory/${id}/adjustment`, data);
    return res.data;
  },

  // 5. Stock Movement History
  getItemMovements: async (id: number): Promise<StockMovement[]> => {
    const res = await apiClient.get<StockMovement[]>(`/inventory/${id}/movements`);
    return res.data;
  },

  getAllMovements: async (params?: {
    search?: string;
    transaction_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedMovementsResponse> => {
    const res = await apiClient.get<PaginatedMovementsResponse>('/inventory/movements/all', { params });
    return res.data;
  },

  // Dashboard Live Stats
  getDashboardStats: async () => {
    const res = await apiClient.get('/dashboard/');
    return res.data;
  }
};