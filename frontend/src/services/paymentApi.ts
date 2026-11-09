import { apiClient } from './apiClient';
import type { Order, OrderItemCreate } from '../types/order';

export interface CashfreeSessionPayload {
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_address?: string;
  tax_rate?: number;
  discount_amount?: number;
  payment_method?: string;
  notes?: string;
  items: OrderItemCreate[];
}

export interface CashfreeSessionResponse {
  payment_session_id: string;
  cf_order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: string;
  environment: 'sandbox' | 'production';
}

export interface CashfreeVerifyResponse {
  success: boolean;
  message: string;
  cf_order_id: string;
  cf_payment_id?: string;
  payment_status: string;
  payment_method?: string;
  order?: Order;
}

export interface PaymentTransactionItem {
  id: number;
  order_id?: number;
  cf_order_id: string;
  cf_payment_id?: string;
  payment_session_id?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  status: string;
  gateway: string;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
}

export const paymentApi = {
  createSession: async (payload: CashfreeSessionPayload): Promise<CashfreeSessionResponse> => {
    const res = await apiClient.post<CashfreeSessionResponse>('/payments/cashfree/create-session', payload);
    return res.data;
  },

  verifyPayment: async (cfOrderId: string): Promise<CashfreeVerifyResponse> => {
    const res = await apiClient.post<CashfreeVerifyResponse>(`/payments/cashfree/verify/${cfOrderId}`);
    return res.data;
  },

  getTransactions: async (): Promise<PaymentTransactionItem[]> => {
    const res = await apiClient.get<PaymentTransactionItem[]>('/payments/transactions');
    return res.data;
  }
};
