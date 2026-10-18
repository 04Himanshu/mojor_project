export interface PermissionItem {
  code: string;
  name: string;
  module: string;
  description: string;
}

export interface PermissionsCatalog {
  all_permissions: PermissionItem[];
  grouped_by_module: Record<string, PermissionItem[]>;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  color: string;
  permissions: string[];
  is_system: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface RoleCreatePayload {
  name: string;
  description?: string;
  color?: string;
  permissions: string[];
}

export interface RoleUpdatePayload {
  name?: string;
  description?: string;
  color?: string;
  permissions?: string[];
}

export type UserStatus = 'Active' | 'Suspended' | 'Inactive';

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  role_color: string;
  role_permissions: string[];
  phone: string | null;
  department: string;
  status: UserStatus;
  is_active: boolean;
  avatar_color: string;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreatePayload {
  name: string;
  email: string;
  role_id: number;
  phone?: string;
  department?: string;
  status?: string;
  password?: string;
  avatar_color?: string;
}

export interface UserUpdatePayload {
  name?: string;
  email?: string;
  role_id?: number;
  phone?: string;
  department?: string;
  status?: string;
  is_active?: boolean;
  password?: string;
  avatar_color?: string;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  total_roles: number;
  admin_users: number;
}

export const DEPARTMENTS = [
  'Operations',
  'Logistics & Warehouse',
  'Procurement',
  'Sales & Fulfillment',
  'Finance & Admin',
  'Executive'
] as const;

export const AVATAR_COLORS = [
  { id: 'purple', bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-300 dark:border-purple-800', light: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' },
  { id: 'blue', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-300 dark:border-blue-800', light: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
  { id: 'indigo', bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-300 dark:border-indigo-800', light: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' },
  { id: 'emerald', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-300 dark:border-emerald-800', light: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
  { id: 'amber', bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-300 dark:border-amber-800', light: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  { id: 'rose', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-300 dark:border-rose-800', light: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' },
  { id: 'cyan', bg: 'bg-cyan-600', text: 'text-cyan-600', border: 'border-cyan-300 dark:border-cyan-800', light: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300' },
] as const;

export const ROLE_COLORS: Record<string, { badge: string; dot: string; border: string }> = {
  purple: {
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    dot: 'bg-purple-500',
    border: 'border-purple-500'
  },
  blue: {
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    dot: 'bg-blue-500',
    border: 'border-blue-500'
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
    dot: 'bg-indigo-500',
    border: 'border-indigo-500'
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
    border: 'border-emerald-500'
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    dot: 'bg-amber-500',
    border: 'border-amber-500'
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    dot: 'bg-rose-500',
    border: 'border-rose-500'
  },
  cyan: {
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
    dot: 'bg-cyan-500',
    border: 'border-cyan-500'
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    border: 'border-slate-400'
  }
};
