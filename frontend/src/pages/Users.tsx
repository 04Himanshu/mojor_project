import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  RefreshCw 
} from 'lucide-react';

import type {
  User,
  Role,
  UserStats,
  PermissionsCatalog,
  UserCreatePayload,
  UserUpdatePayload,
  RoleCreatePayload,
  RoleUpdatePayload
} from '../types/user';
import { userApi } from '../services/userApi';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { UserStatsCards } from '../components/users/UserStatsCards';
import { UsersTable } from '../components/users/UsersTable';
import { RolesMatrixTab } from '../components/users/RolesMatrixTab';
import { CreateUserModal } from '../components/users/CreateUserModal';
import { CreateRoleModal } from '../components/users/CreateRoleModal';

export const UsersPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionsCatalog | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters for Users Table
  const [userSearch, setUserSearch] = useState('');
  const [userDepartmentFilter, setUserDepartmentFilter] = useState('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  // Deletion confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'user' | 'role';
    id: number;
    name: string;
    description?: string;
  } | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, rolesData, permsData] = await Promise.all([
        userApi.getStats(),
        userApi.getRoles(),
        userApi.getPermissions()
      ]);
      setStats(statsData);
      setRoles(rolesData);
      setPermissionsCatalog(permsData);

      const usersData = await userApi.getUsers({
        search: userSearch || undefined,
        department: userDepartmentFilter !== 'ALL' ? userDepartmentFilter : undefined,
        role_id: userRoleFilter !== 'ALL' ? Number(userRoleFilter) : undefined,
        status: userStatusFilter !== 'ALL' ? userStatusFilter : undefined,
      });
      setUsers(usersData);
    } catch (err: any) {
      console.error('Failed to load user and role records:', err);
      toast.error('Unable to load staff directory. Please check your network connection.', 'Connection Error');
    } finally {
      setLoading(false);
    }
  }, [userSearch, userDepartmentFilter, userRoleFilter, userStatusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle User Modal Submit
  const handleUserSubmit = async (payload: UserCreatePayload | UserUpdatePayload, isEditing: boolean) => {
    if (isEditing && userToEdit) {
      await userApi.updateUser(userToEdit.id, payload as UserUpdatePayload);
      toast.success(`Staff account for '${payload.name}' updated successfully.`, 'Profile Updated');
    } else {
      await userApi.createUser(payload as UserCreatePayload);
      toast.success(`New staff member '${payload.name}' added successfully.`, 'Staff Registered');
    }
    loadData();
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await userApi.updateUserStatus(user.id, newStatus);
      toast.info(`Account status for '${user.name}' changed to ${newStatus}.`, 'Status Updated');
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update account status';
      toast.error(msg, 'Status Update Failed');
    }
  };

  // Handle Role Modal Submit
  const handleRoleSubmit = async (payload: RoleCreatePayload | RoleUpdatePayload, isEditing: boolean) => {
    if (isEditing && roleToEdit) {
      await userApi.updateRole(roleToEdit.id, payload as RoleUpdatePayload);
      toast.success(`Role policy '${payload.name || roleToEdit.name}' updated successfully.`, 'Policy Updated');
    } else {
      await userApi.createRole(payload as RoleCreatePayload);
      toast.success(`Custom role '${payload.name}' created successfully.`, 'Role Created');
    }
    loadData();
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'user') {
        await userApi.deleteUser(deleteConfirm.id);
        toast.success(`Staff account for '${deleteConfirm.name}' removed successfully.`, 'User Deleted');
      } else {
        await userApi.deleteRole(deleteConfirm.id);
        toast.success(`Role policy '${deleteConfirm.name}' deleted successfully.`, 'Role Deleted');
      }
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Deletion failed';
      toast.error(msg, 'Deletion Failed');
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Staff & Access Control
            </h1>
            <span className="badge-info text-[10px]">
              Access Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage staff accounts, department assignments, and configure granular role-based security privileges
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadData()}
            title="Refresh Directory"
            className="btn-secondary text-xs py-2 px-3"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="ml-1.5">Refresh</span>
          </button>

          <button
            onClick={() => {
              setRoleToEdit(null);
              setIsRoleModalOpen(true);
            }}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-purple-600 dark:text-purple-400"
          >
            <ShieldCheck size={14} />
            <span>New Role</span>
          </button>

          <button
            onClick={() => {
              setUserToEdit(null);
              setIsUserModalOpen(true);
            }}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <UserPlus size={14} />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Executive Metric Cards */}
      <UserStatsCards stats={stats} />

      {/* Main Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Users size={15} />
          <span>Staff Directory</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-medium">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Roles & Permissions</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-medium">
            {roles.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'users' && (
        <UsersTable
          users={users}
          roles={roles}
          loading={loading}
          search={userSearch}
          onSearchChange={setUserSearch}
          departmentFilter={userDepartmentFilter}
          onDepartmentFilterChange={setUserDepartmentFilter}
          roleFilter={userRoleFilter}
          onRoleFilterChange={setUserRoleFilter}
          statusFilter={userStatusFilter}
          onStatusFilterChange={setUserStatusFilter}
          onEditUser={(user) => {
            setUserToEdit(user);
            setIsUserModalOpen(true);
          }}
          onToggleStatus={handleToggleStatus}
          onDeleteUser={(user) => {
            setDeleteConfirm({
              type: 'user',
              id: user.id,
              name: user.name,
              description: `Are you sure you want to delete the staff account for '${user.name}' (${user.email})? This action cannot be undone.`
            });
          }}
        />
      )}

      {activeTab === 'roles' && (
        <RolesMatrixTab
          roles={roles}
          permissionsCatalog={permissionsCatalog}
          loading={loading}
          onCreateRole={() => {
            setRoleToEdit(null);
            setIsRoleModalOpen(true);
          }}
          onEditRole={(role) => {
            setRoleToEdit(role);
            setIsRoleModalOpen(true);
          }}
          onDeleteRole={(role) => {
            setDeleteConfirm({
              type: 'role',
              id: role.id,
              name: role.name,
              description: `Are you sure you want to delete the custom role '${role.name}'? Only roles with 0 assigned staff can be deleted.`
            });
          }}
        />
      )}

      {/* Create / Edit User Modal */}
      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleUserSubmit}
        userToEdit={userToEdit}
        roles={roles}
      />

      {/* Create / Edit Role Modal */}
      <CreateRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSubmit={handleRoleSubmit}
        roleToEdit={roleToEdit}
        permissionsCatalog={permissionsCatalog}
      />

      {/* Deletion Safety Confirmation Dialog */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm?.type === 'user' ? 'Delete Staff Account' : 'Delete Custom Role'}
        subtitle="This action is permanent and cannot be undone"
        message={deleteConfirm?.description || ''}
        itemName={deleteConfirm?.name}
        itemType={deleteConfirm?.type === 'user' ? 'STAFF ACCOUNT' : 'SECURITY ROLE'}
        confirmText={deleteConfirm?.type === 'user' ? 'Delete Staff Member' : 'Delete Role Policy'}
        variant="danger"
      />
    </div>
  );
};

export default UsersPage;
