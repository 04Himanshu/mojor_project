import { apiClient } from './apiClient';
import type { AuthResponse, DemoAccount, LoginPayload, AuthUser } from '../types/auth';

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', {
      email: payload.email,
      password: payload.password,
    });
    return res.data;
  },

  getMe: async (): Promise<AuthUser> => {
    const res = await apiClient.get<AuthUser>('/auth/me');
    return res.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/auth/logout');
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string; reset_token?: string }> => {
    const res = await apiClient.post<{ message: string; reset_token?: string }>('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token: string, new_password: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      new_password,
    });
    return res.data;
  },

  getDemoAccounts: async (): Promise<DemoAccount[]> => {
    const res = await apiClient.get<DemoAccount[]>('/auth/demo-accounts');
    return res.data;
  },
};
