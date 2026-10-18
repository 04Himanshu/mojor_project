import React, { useState, useEffect } from 'react';
import type { User, Role, UserCreatePayload, UserUpdatePayload } from '../../types/user';
import { DEPARTMENTS, AVATAR_COLORS } from '../../types/user';
import { 
  X, 
  UserPlus, 
  Edit3, 
  Mail, 
  Phone, 
  Building, 
  Shield, 
  Lock, 
  Palette, 
  AlertCircle 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: UserCreatePayload | UserUpdatePayload, isEditing: boolean) => Promise<void>;
  userToEdit: User | null;
  roles: Role[];
}

export const CreateUserModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  userToEdit,
  roles,
}) => {
  const isEditing = !!userToEdit;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<string>('Operations');
  const [roleId, setRoleId] = useState<number>(roles[0]?.id || 1);
  const [status, setStatus] = useState<string>('Active');
  const [password, setPassword] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>('blue');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setPhone(userToEdit.phone || '');
      setDepartment(userToEdit.department || 'Operations');
      setRoleId(userToEdit.role_id);
      setStatus(userToEdit.status || 'Active');
      setAvatarColor(userToEdit.avatar_color || 'blue');
      setPassword('');
      setError(null);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setDepartment('Operations');
      setRoleId(roles[0]?.id || 1);
      setStatus('Active');
      setAvatarColor('blue');
      setPassword('');
      setError(null);
    }
  }, [userToEdit, roles, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Staff member name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid work email address is required.');
      return;
    }
    if (!roleId) {
      setError('Please select an assigned role.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        const payload: UserUpdatePayload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role_id: roleId,
          phone: phone.trim() || undefined,
          department,
          status,
          avatar_color: avatarColor,
        };
        if (password.trim()) {
          payload.password = password.trim();
        }
        await onSubmit(payload, true);
      } else {
        const payload: UserCreatePayload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role_id: roleId,
          phone: phone.trim() || undefined,
          department,
          status,
          avatar_color: avatarColor,
          password: password.trim() || undefined,
        };
        await onSubmit(payload, false);
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save staff member';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              {isEditing ? <Edit3 size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Staff Profile' : 'Add Staff Member'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Update profile information and access role' : 'Register a new team member and configure initial permissions'}
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priyanshu Singh"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@eom.com"
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Role <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Shield size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(Number(e.target.value))}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_system ? '(System)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Department
              </label>
              <div className="relative">
                <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Phone & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="Active">Active (Full Access)</option>
                <option value="Suspended">Suspended (Access Paused)</option>
                <option value="Inactive">Inactive (Disabled)</option>
              </select>
            </div>
          </div>

          {/* Password (Optional for updates) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isEditing ? 'Reset Password (leave empty to keep unchanged)' : 'Initial Password'}
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? '••••••••' : 'Enter initial password'}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Avatar Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Palette size={13} />
              Avatar Theme
            </label>
            <div className="flex items-center gap-2.5">
              {AVATAR_COLORS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setAvatarColor(col.id)}
                  className={`w-7 h-7 rounded-full ${col.bg} transition-all flex items-center justify-center text-white ${
                    avatarColor === col.id ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={col.id}
                />
              ))}
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
              {isEditing ? 'Save Changes' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
