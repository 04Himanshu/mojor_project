import React, { useState } from 'react';
import type { Role, PermissionsCatalog } from '../../types/user';
import { ROLE_COLORS } from '../../types/user';
import { 
  Shield, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Layers, 
  Lock, 
  Users,
  Grid,
  Table as TableIcon
} from 'lucide-react';

interface Props {
  roles: Role[];
  permissionsCatalog: PermissionsCatalog | null;
  loading: boolean;
  onCreateRole: () => void;
  onEditRole: (role: Role) => void;
  onDeleteRole: (role: Role) => void;
}

export const RolesMatrixTab: React.FC<Props> = ({
  roles,
  permissionsCatalog,
  loading,
  onCreateRole,
  onEditRole,
  onDeleteRole,
}) => {
  const [activeSubView, setActiveSubView] = useState<'cards' | 'matrix'>('cards');
  const [matrixModuleFilter, setMatrixModuleFilter] = useState<string>('ALL');

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400">
        <div className="inline-flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading roles and security matrix...</span>
        </div>
      </div>
    );
  }

  const allPerms = permissionsCatalog?.all_permissions || [];
  const groupedModules = permissionsCatalog?.grouped_by_module || {};
  const moduleNames = Object.keys(groupedModules);

  return (
    <div className="space-y-6">
      {/* View Switcher and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveSubView('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeSubView === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid size={14} />
              Role Cards ({roles.length})
            </button>
            <button
              onClick={() => setActiveSubView('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeSubView === 'matrix'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon size={14} />
              Permission Matrix ({allPerms.length} Controls)
            </button>
          </div>
        </div>

        <button
          onClick={onCreateRole}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus size={15} />
          Create Custom Role
        </button>
      </div>

      {/* Cards View */}
      {activeSubView === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {roles.map((r) => {
            const colorCfg = ROLE_COLORS[r.color] || ROLE_COLORS.blue;
            return (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
              >
                {/* Header Tag Bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${
                  r.color === 'purple' ? 'from-purple-500 to-indigo-500' :
                  r.color === 'emerald' ? 'from-emerald-500 to-teal-500' :
                  r.color === 'amber' ? 'from-amber-500 to-orange-500' :
                  r.color === 'rose' ? 'from-rose-500 to-pink-500' :
                  r.color === 'indigo' ? 'from-indigo-500 to-blue-500' :
                  'from-blue-500 to-cyan-500'
                }`} />

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Title & Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl border ${colorCfg.badge} shrink-0`}>
                          <Shield size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">
                            {r.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                              <Users size={11} />
                              {r.user_count} {r.user_count === 1 ? 'member' : 'members'} assigned
                            </span>
                          </div>
                        </div>
                      </div>

                      {r.is_system ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                          <Lock size={10} />
                          SYSTEM
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                          CUSTOM
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {r.description || 'No description provided for this role.'}
                    </p>
                  </div>

                  {/* Permissions Chips Preview */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      <span>Permissions ({r.permissions.length})</span>
                      {r.permissions.length === allPerms.length && (
                        <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 text-[10px] normal-case">
                          <ShieldCheck size={11} /> Full Authority
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-none p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      {r.permissions.length === 0 ? (
                        <span className="text-xs text-slate-400 italic px-2 py-1">No permissions granted</span>
                      ) : (
                        r.permissions.map((pCode) => {
                          const meta = allPerms.find((p) => p.code === pCode);
                          return (
                            <span
                              key={pCode}
                              title={meta?.description || pCode}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shadow-2xs"
                            >
                              <span className="w-1 h-1 rounded-full bg-blue-500" />
                              {meta?.name || pCode}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Updated {new Date(r.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEditRole(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      >
                        <Edit3 size={12} />
                        Configure
                      </button>

                      {!r.is_system && (
                        <button
                          onClick={() => onDeleteRole(r)}
                          title="Delete Custom Role"
                          className="p-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permission Matrix View */}
      {activeSubView === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Module Filter bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setMatrixModuleFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  matrixModuleFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Modules ({allPerms.length})
              </button>
              {moduleNames.map((mod) => (
                <button
                  key={mod}
                  onClick={() => setMatrixModuleFilter(mod)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    matrixModuleFilter === mod
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {mod} ({groupedModules[mod].length})
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Layers size={13} />
              Enterprise Access Control Matrix
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800 select-none">
                <tr>
                  <th className="py-3.5 px-4 min-w-[220px]">Permission Control</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Module</th>
                  {roles.map((r) => (
                    <th key={r.id} className="py-3.5 px-3 text-center min-w-[110px] whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{r.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal lowercase">{r.permissions.length} perms</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {allPerms
                  .filter((p) => matrixModuleFilter === 'ALL' || p.module === matrixModuleFilter)
                  .map((perm) => (
                    <tr
                      key={perm.code}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Permission name and description */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {perm.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {perm.code}
                        </div>
                      </td>

                      {/* Module */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {perm.module}
                        </span>
                      </td>

                      {/* Role Checkmarks */}
                      {roles.map((r) => {
                        const hasPerm = r.permissions.includes(perm.code);
                        return (
                          <td key={r.id} className="py-3 px-3 text-center">
                            {hasPerm ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                                <Check size={13} strokeWidth={2.5} />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600">
                                <X size={12} />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
