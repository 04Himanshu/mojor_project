import React from 'react';
import { Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PackageSearch, Loader2, ShieldAlert, ArrowLeft, LayoutDashboard, Lock } from 'lucide-react';
import { isAdmin, hasRole, hasPermission, hasAnyPermission } from '../../utils/rbac';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  adminOnly?: boolean;
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
  requiredRole,
  requiredPermission,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070C18] flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Soft Ambient Light Gradient Washes */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-100/40 dark:from-blue-950/20 via-indigo-50/20 to-transparent pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-200/25 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-50 dark:ring-blue-950/40">
              <PackageSearch size={32} className="text-white animate-pulse" />
            </div>
            <Loader2
              size={68}
              className="absolute -top-0.5 -left-0.5 text-blue-600 animate-spin opacity-40"
            />
          </div>

          <div className="text-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Enterprise Operations Manager
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
              Verifying active staff credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // RBAC Evaluation
  let isAuthorized = true;
  let denialReason = '';

  if (adminOnly && !isAdmin(user)) {
    isAuthorized = false;
    denialReason = 'This area is strictly restricted to System Administrators. Your current role does not have administrative privileges.';
  } else if (requiredRole && !hasRole(user, requiredRole)) {
    isAuthorized = false;
    const requiredStr = Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole;
    denialReason = `Your assigned role ('${user?.role_name || 'Staff'}') lacks clearance. Required role: ${requiredStr}.`;
  } else if (requiredPermission) {
    const hasPerm = Array.isArray(requiredPermission)
      ? hasAnyPermission(user, requiredPermission)
      : hasPermission(user, requiredPermission);
    if (!hasPerm) {
      isAuthorized = false;
      const permStr = Array.isArray(requiredPermission) ? requiredPermission.join(', ') : requiredPermission;
      denialReason = `Your account lacks the necessary module permission (${permStr}) to perform this operation.`;
    }
  }

  // Access Denied (403) Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6 select-none">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40 text-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-rose-500/15 to-amber-500/15 border border-rose-500/25 flex items-center justify-center text-rose-500 shadow-inner">
            <ShieldAlert size={32} />
          </div>

          {/* Heading */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold uppercase tracking-wider mb-3">
            <Lock size={12} />
            <span>Access Restricted (403 Forbidden)</span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Role Authorization Required
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed max-w-md mx-auto">
            {denialReason}
          </p>

          {/* User Role Card */}
          <div className="mt-6 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl flex items-center justify-between text-left">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Active Staff Member
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {user?.name || 'Staff User'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Assigned Role
              </p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {user?.role_name || 'Staff'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Go Back</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
