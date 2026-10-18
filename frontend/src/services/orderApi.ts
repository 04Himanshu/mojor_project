import axios from 'axios';
import type {
  Order,
  OrderStats,
  OrderCreatePayload,
  OrderStatusUpdatePayload,
  InvoiceData,
  Customer
} from '../types/order';

const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const orderApi = {
  getOrders: async (params?: {
    status?: string;
    search?: string;
    payment_status?: string;
  }): Promise<Order[]> => {
    const res = await apiClient.get<Order[]>('/orders/', { params });
    return res.data;
  },

  getOrderById: async (orderId: number): Promise<Order> => {
    const res = await apiClient.get<Order>(`/orders/${orderId}`);
    return res.data;
  },

  getOrderStats: async (): Promise<OrderStats> => {
    const res = await apiClient.get<OrderStats>('/orders/stats');
    return res.data;
  },

  createOrder: async (payload: OrderCreatePayload): Promise<Order> => {
    const res = await apiClient.post<Order>('/orders/', payload);
    return res.data;
  },

  updateOrderStatus: async (orderId: number, payload: OrderStatusUpdatePayload): Promise<Order> => {
    const res = await apiClient.put<Order>(`/orders/${orderId}/status`, payload);
    return res.data;
  },

  getOrderInvoice: async (orderId: number): Promise<InvoiceData> => {
    const res = await apiClient.get<InvoiceData>(`/orders/${orderId}/invoice`);
    return res.data;
  },

  getCustomers: async (): Promise<Customer[]> => {
    const res = await apiClient.get<Customer[]>('/customers/');
    return res.data;
  },

  createCustomer: async (payload: Omit<Customer, 'id'>): Promise<Customer> => {
    const res = await apiClient.post<Customer>('/customers/', payload);
    return res.data;
  }
};
