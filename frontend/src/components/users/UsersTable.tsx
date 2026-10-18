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
  KeyRound
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
    }
  };

  const getRoleBadge = (roleName: string, roleColor: string) => {
    const colorStyle = ROLE_COLORS[roleColor] || ROLE_COLORS.blue;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorStyle.badge}`}>
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header controls & filter tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onStatusFilterChange(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Secondary Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, email, phone, role, or department..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => onDepartmentFilterChange(e.target.value)}
              aria-label="Filter users by department"
              className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800 select-none">
            <tr>
              <th className="py-3 px-4 whitespace-nowrap">Staff Member</th>
              <th className="py-3 px-4 whitespace-nowrap">Department</th>
              <th className="py-3 px-4 whitespace-nowrap">Assigned Role</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Permissions</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
              <th className="py-3 px-4 whitespace-nowrap">Contact</th>
              <th className="py-3 px-4 whitespace-nowrap">Last Login</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
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
                <td colSpan={8} className="py-12 text-center">
                  <AlertCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No staff accounts found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or add a new team member.</p>
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isAdmin = u.role_name === 'Administrator';
                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* User profile with initials */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
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
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
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
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Building size={12} className="text-slate-400" />
                        {u.department}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getRoleBadge(u.role_name, u.role_color)}
                    </td>

                    {/* Permissions count */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                        <Shield size={11} />
                        {u.role_permissions.length} perms
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(u.status)}
                    </td>

                    {/* Contact Phone */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {u.phone ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Phone size={11} className="text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
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
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Toggle Status */}
                        <button
                          onClick={() => onToggleStatus(u)}
                          title={u.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                          className={`p-1.5 rounded-lg border transition-all ${
                            u.status === 'Active'
                              ? 'border-amber-200 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                              : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          }`}
                        >
                          {u.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>

                        {/* Edit User */}
                        <button
                          onClick={() => onEditUser(u)}
                          title="Edit Staff Member"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => onDeleteUser(u)}
                          title={isAdmin ? "System Administrator Account" : "Delete Staff Member"}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
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
