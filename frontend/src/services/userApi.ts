import axios from 'axios';
import type {
  User,
  UserCreatePayload,
  UserUpdatePayload,
  UserStats,
  Role,
  RoleCreatePayload,
  RoleUpdatePayload,
  PermissionsCatalog
} from '../types/user';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userApi = {
  // Stats
  getStats: async (): Promise<UserStats> => {
    const res = await apiClient.get<UserStats>('/users/stats');
    return res.data;
  },

  // Permissions Catalog
  getPermissions: async (): Promise<PermissionsCatalog> => {
    const res = await apiClient.get<PermissionsCatalog>('/users/permissions');
    return res.data;
  },

  // Roles
  getRoles: async (): Promise<Role[]> => {
    const res = await apiClient.get<Role[]>('/users/roles');
    return res.data;
  },

  getRoleById: async (id: number): Promise<Role> => {
    const res = await apiClient.get<Role>(`/users/roles/${id}`);
    return res.data;
  },

  createRole: async (payload: RoleCreatePayload): Promise<Role> => {
    const res = await apiClient.post<Role>('/users/roles', payload);
    return res.data;
  },

  updateRole: async (id: number, payload: RoleUpdatePayload): Promise<Role> => {
    const res = await apiClient.put<Role>(`/users/roles/${id}`, payload);
    return res.data;
  },

  deleteRole: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/roles/${id}`);
  },

  // Users
  getUsers: async (params?: {
    search?: string;
    role_id?: number;
    department?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/users/', { params });
    return res.data;
  },

  getUserById: async (id: number): Promise<User> => {
    const res = await apiClient.get<User>(`/users/${id}`);
    return res.data;
  },

  createUser: async (payload: UserCreatePayload): Promise<User> => {
    const res = await apiClient.post<User>('/users/', payload);
    return res.data;
  },

  updateUser: async (id: number, payload: UserUpdatePayload): Promise<User> => {
    const res = await apiClient.put<User>(`/users/${id}`, payload);
    return res.data;
  },

  updateUserStatus: async (id: number, status: string): Promise<User> => {
    const res = await apiClient.patch<User>(`/users/${id}/status`, { status });
    return res.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
