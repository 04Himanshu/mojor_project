import axios from 'axios';
import type { AuthResponse, DemoAccount, LoginPayload, AuthUser } from '../types/auth';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach bearer token if present in localStorage or sessionStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('eom_auth_token') || sessionStorage.getItem('eom_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

  getDemoAccounts: async (): Promise<DemoAccount[]> => {
    const res = await apiClient.get<DemoAccount[]>('/auth/demo-accounts');
    return res.data;
  },
};
