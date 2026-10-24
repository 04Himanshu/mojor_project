import React from 'react';
import type { User, Role } from '../../types/user';
import { ROLE_COLORS, DEPARTMENTS } from '../../types/user';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Shield, 
  Edit3, 
  Trash2, 
  AlertCircle,
  Building,
  Mail,
  Phone,
  Clock,
  KeyRound,
  X
} from 'lucide-react';

interface Props {
  users: User[];
  roles: Role[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (val: string) => void;
  roleFilter: string;
  onRoleFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onEditUser: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onDeleteUser: (user: User) => void;
}

const STATUS_TABS = [
  { id: 'ALL', label: 'All Staff' },
  { id: 'Active', label: 'Active' },
  { id: 'Suspended', label: 'Suspended' },
  { id: 'Inactive', label: 'Inactive' },
];

export const UsersTable: React.FC<Props> = ({
  users,
  roles,
  loading,
  search,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onEditUser,
  onToggleStatus,
  onDeleteUser,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="badge-success">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'Suspended':
        return (
          <span className="badge-warning">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="badge-neutral">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
    }
  };

  const getRoleBadge = (roleName: string, roleColor: string) => {
    const colorStyle = ROLE_COLORS[roleColor] || ROLE_COLORS.blue;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${colorStyle.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colorStyle.dot}`} />
        {roleName}
      </span>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
  };

  const hasActiveFilters = Boolean(
    search ||
    departmentFilter !== 'ALL' ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL'
  );

  const handleClearFilters = () => {
    onSearchChange('');
    onDepartmentFilterChange('ALL');
    onRoleFilterChange('ALL');
    onStatusFilterChange('ALL');
  };

  return (
    <div className="table-container flex flex-col">
      {/* Header controls & filter tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-4">
        {/* Status Tabs & Active Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>
              Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{users.length}</strong> staff members
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Search & Secondary Filters (Horizontally Aligned) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, email, phone, role, or department..."
              className="input-base pl-9 pr-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:shrink-0 w-full sm:w-auto">
            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => onDepartmentFilterChange(e.target.value)}
              aria-label="Filter users by department"
              className="select-base text-xs w-full sm:w-44"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              aria-label="Filter users by role"
              className="select-base text-xs w-full sm:w-40"
            >
              <option value="ALL">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id.toString()}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="table-th">Staff Member</th>
              <th className="table-th">Department</th>
              <th className="table-th">Assigned Role</th>
              <th className="table-th text-center">Permissions</th>
              <th className="table-th text-center">Status</th>
              <th className="table-th">Contact</th>
              <th className="table-th">Last Login</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading staff directory...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <AlertCircle size={32} className="mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                  <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">No staff accounts found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or add a new team member.</p>
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isAdmin = u.role_name === 'Administrator';
                return (
                  <tr
                    key={u.id}
                    className="table-row-hover group"
                  >
                    {/* User profile with initials */}
                    <td className="table-td whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 ${
                          u.avatar_color === 'purple' ? 'bg-purple-600' :
                          u.avatar_color === 'emerald' ? 'bg-emerald-600' :
                          u.avatar_color === 'amber' ? 'bg-amber-600' :
                          u.avatar_color === 'rose' ? 'bg-rose-600' :
                          u.avatar_color === 'cyan' ? 'bg-cyan-600' :
                          u.avatar_color === 'indigo' ? 'bg-indigo-600' :
                          'bg-blue-600'
                        }`}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {u.name}
                            {isAdmin && (
                              <span title="System Administrator">
                                <KeyRound size={13} className="text-amber-500 inline-block" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Mail size={11} />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="table-td whitespace-nowrap">
                      <span className="badge-neutral text-[11px]">
                        <Building size={11} className="text-slate-400" />
                        {u.department}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="table-td whitespace-nowrap">
                      {getRoleBadge(u.role_name, u.role_color)}
                    </td>

                    {/* Permissions count */}
                    <td className="table-td text-center whitespace-nowrap">
                      <span className="badge-info text-[11px] font-mono">
                        <Shield size={11} />
                        {u.role_permissions.length} perms
                      </span>
                    </td>

                    {/* Status */}
                    <td className="table-td text-center whitespace-nowrap">
                      {getStatusBadge(u.status)}
                    </td>

                    {/* Contact Phone */}
                    <td className="table-td whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {u.phone ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Phone size={11} className="text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Last Login */}
                    <td className="table-td whitespace-nowrap text-slate-500">
                      {u.last_login ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock size={11} className="text-slate-400" />
                          <span>{new Date(u.last_login).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Never logged in</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="table-td text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Toggle Status */}
                        <button
                          onClick={() => onToggleStatus(u)}
                          title={u.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                          className={`btn-ghost p-1.5 rounded-lg ${
                            u.status === 'Active'
                              ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400'
                              : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {u.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>

                        {/* Edit User */}
                        <button
                          onClick={() => onEditUser(u)}
                          title="Edit Staff Member"
                          className="btn-ghost p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => onDeleteUser(u)}
                          title={isAdmin ? "System Administrator Account" : "Delete Staff Member"}
                          className="btn-ghost p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
