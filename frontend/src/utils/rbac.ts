import type { User } from '../types/user';
import { useAuth } from '../context/AuthContext';

// System Role Names
export const ROLE_NAMES = {
  ADMIN: 'Administrator',
  ADMIN_ALIAS: 'Admin',
  INVENTORY_MANAGER: 'Inventory Manager',
  PROCUREMENT_SPECIALIST: 'Procurement Specialist',
  SALES_EXECUTIVE: 'Sales & Order Executive',
  WAREHOUSE_OPERATOR: 'Warehouse Operator',
  AUDITOR: 'Auditor & Viewer',
} as const;

// Granular RBAC Permissions matching backend catalog
export const PERMISSIONS = {
  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_EDIT: 'inventory:edit',
  INVENTORY_DELETE: 'inventory:delete',
  INVENTORY_STOCK_ADJUST: 'inventory:stock_adjust',

  // Orders
  ORDERS_VIEW: 'orders:view',
  ORDERS_CREATE: 'orders:create',
  ORDERS_STATUS_CHANGE: 'orders:status_change',
  ORDERS_INVOICE: 'orders:invoice',

  // Procurement & Vendors
  PROCUREMENT_VIEW: 'procurement:view',
  PROCUREMENT_CREATE_PO: 'procurement:create_po',
  PROCUREMENT_GRN_RECEIVE: 'procurement:grn_receive',
  SUPPLIERS_MANAGE: 'suppliers:manage',

  // Users & Roles
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  ROLES_MANAGE: 'roles:manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;

/**
 * Check if the user has an Administrator role.
 * Administrators have full unrestricted access across all modules, routes, and actions.
 */
export const isAdmin = (user?: User | null): boolean => {
  if (!user || !user.role_name) return false;
  const role = user.role_name.trim().toLowerCase();
  return role === 'administrator' || role === 'admin';
};

/**
 * Check if the user has any of the specified roles.
 * Administrators automatically satisfy all role checks.
 */
export const hasRole = (
  user: User | null | undefined,
  roles: string | string[]
): boolean => {
  if (!user || !user.role_name) return false;
  if (isAdmin(user)) return true;

  const roleList = Array.isArray(roles) ? roles : [roles];
  const userRole = user.role_name.trim().toLowerCase();
  return roleList.some((r) => r.trim().toLowerCase() === userRole);
};

/**
 * Check if the user has a specific permission.
 * Administrators automatically possess all permissions.
 */
export const hasPermission = (
  user: User | null | undefined,
  permission: PermissionCode
): boolean => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const userPerms = user.role_permissions || [];
  return userPerms.includes(permission);
};

/**
 * Check if the user has AT LEAST ONE of the specified permissions.
 * Administrators automatically possess all permissions.
 */
export const hasAnyPermission = (
  user: User | null | undefined,
  permissions: PermissionCode[]
): boolean => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const userPerms = user.role_permissions || [];
  return permissions.some((p) => userPerms.includes(p));
};

/**
 * Check if the user has ALL of the specified permissions.
 * Administrators automatically possess all permissions.
 */
export const hasAllPermissions = (
  user: User | null | undefined,
  permissions: PermissionCode[]
): boolean => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const userPerms = user.role_permissions || [];
  return permissions.every((p) => userPerms.includes(p));
};

/**
 * Route-level access evaluator.
 * Determines if a given route is visible and accessible for the current user.
 */
export const canAccessRoute = (
  user: User | null | undefined,
  pathname: string
): boolean => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const cleanPath = pathname.replace(/^\/+/, '').split('/')[0];

  switch (cleanPath) {
    case '':
    case 'dashboard':
      // Dashboard is accessible to all authenticated staff
      return true;

    case 'walk-in-order':
      // Point-of-Sale counter requires order creation or order viewing privileges
      return hasAnyPermission(user, [PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_VIEW]);

    case 'inventory':
      // Inventory requires inventory:view permission
      return hasPermission(user, PERMISSIONS.INVENTORY_VIEW);

    case 'orders':
      // Sales orders require orders:view permission
      return hasPermission(user, PERMISSIONS.ORDERS_VIEW);

    case 'vendors':
      // Procurement and vendors require procurement:view permission
      return hasPermission(user, PERMISSIONS.PROCUREMENT_VIEW);

    case 'users':
      // STRICT: Users & Roles is ONLY accessible to Administrators
      return isAdmin(user);

    default:
      return true;
  }
};

/**
 * Ergonomic custom hook for functional components.
 */
export const useRBAC = () => {
  const { user } = useAuth();

  return {
    user,
    isAdmin: isAdmin(user),
    hasRole: (roles: string | string[]) => hasRole(user, roles),
    hasPermission: (permission: PermissionCode) => hasPermission(user, permission),
    hasAnyPermission: (permissions: PermissionCode[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: PermissionCode[]) => hasAllPermissions(user, permissions),
    canAccessRoute: (pathname: string) => canAccessRoute(user, pathname),
  };
};

