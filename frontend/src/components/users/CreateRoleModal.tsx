import React, { useState, useEffect } from 'react';
import type { Role, PermissionsCatalog, RoleCreatePayload, RoleUpdatePayload } from '../../types/user';
import { ROLE_COLORS } from '../../types/user';
import { 
  X, 
  ShieldCheck, 
  Shield, 
  Palette, 
  AlertCircle, 
  CheckSquare, 
  Square,
  Lock
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: RoleCreatePayload | RoleUpdatePayload, isEditing: boolean) => Promise<void>;
  roleToEdit: Role | null;
  permissionsCatalog: PermissionsCatalog | null;
}

export const CreateRoleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  roleToEdit,
  permissionsCatalog,
}) => {
  const isEditing = !!roleToEdit;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name);
      setDescription(roleToEdit.description || '');
      setColor(roleToEdit.color || 'blue');
      setSelectedPermissions([...roleToEdit.permissions]);
      setError(null);
    } else {
      setName('');
      setDescription('');
      setColor('blue');
      setSelectedPermissions([]);
      setError(null);
    }
  }, [roleToEdit, isOpen]);

  if (!isOpen) return null;

  const allPerms = permissionsCatalog?.all_permissions || [];
  const groupedModules = permissionsCatalog?.grouped_by_module || {};
  const isSystemRole = roleToEdit?.is_system;

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleModulePermissions = (moduleName: string) => {
    const modulePermCodes = (groupedModules[moduleName] || []).map((p) => p.code);
    const hasAll = modulePermCodes.every((c) => selectedPermissions.includes(c));

    if (hasAll) {
      // Remove all in module
      setSelectedPermissions((prev) => prev.filter((c) => !modulePermCodes.includes(c)));
    } else {
      // Add missing in module
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...modulePermCodes])));
    }
  };

  const toggleSelectAll = () => {
    if (selectedPermissions.length === allPerms.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allPerms.map((p) => p.code));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        const payload: RoleUpdatePayload = {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          permissions: selectedPermissions,
        };
        await onSubmit(payload, true);
      } else {
        const payload: RoleCreatePayload = {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          permissions: selectedPermissions,
        };
        await onSubmit(payload, false);
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save role';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isEditing ? `Configure Role: ${roleToEdit.name}` : 'Create Custom Role'}
                </h2>
                {isSystemRole && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Lock size={10} /> SYSTEM ROLE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Define access scope and granular permissions across system modules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Name & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isSystemRole}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Regional Quality Inspector"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 disabled:opacity-60"
              />
              {isSystemRole && (
                <p className="text-[10px] text-slate-400 mt-1">Built-in system role names cannot be renamed.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Palette size={12} />
                Badge Color
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-medium"
              >
                {Object.keys(ROLE_COLORS).map((cKey) => (
                  <option key={cKey} value={cKey}>
                    {cKey.charAt(0).toUpperCase() + cKey.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Role Purpose & Scope
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the operational responsibilities and operational authority..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none"
            />
          </div>

          {/* Permissions Matrix Selector */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Permission Matrix ({selectedPermissions.length} / {allPerms.length} Selected)
                </label>
                <p className="text-[11px] text-slate-400">
                  Select which operations this role is permitted to perform
                </p>
              </div>

              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {selectedPermissions.length === allPerms.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Modules Grid */}
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {Object.entries(groupedModules).map(([moduleName, perms]) => {
                const moduleCodes = perms.map((p) => p.code);
                const isAllInModule = moduleCodes.every((c) => selectedPermissions.includes(c));
                const hasSomeInModule = moduleCodes.some((c) => selectedPermissions.includes(c));

                return (
                  <div
                    key={moduleName}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-blue-500" />
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {moduleName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({perms.length} controls)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleModulePermissions(moduleName)}
                        className="text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1"
                      >
                        {isAllInModule ? (
                          <>
                            <CheckSquare size={13} className="text-blue-600" />
                            All Selected
                          </>
                        ) : hasSomeInModule ? (
                          <>
                            <CheckSquare size={13} className="text-slate-400" />
                            Select All
                          </>
                        ) : (
                          <>
                            <Square size={13} />
                            Select All
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {perms.map((p) => {
                        const checked = selectedPermissions.includes(p.code);
                        return (
                          <label
                            key={p.code}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                              checked
                                ? 'bg-white dark:bg-slate-700/80 border-blue-200 dark:border-blue-800 shadow-2xs'
                                : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.code)}
                              className="mt-0.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold leading-tight ${checked ? 'text-blue-900 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'}`}>
                                {p.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5" title={p.description}>
                                {p.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isEditing ? 'Save Policy Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
