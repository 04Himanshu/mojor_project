import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PackageSearch, Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Soft Ambient Light Gradient Washes */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-100/40 via-indigo-50/20 to-transparent pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-200/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-50">
              <PackageSearch size={32} className="text-white animate-pulse" />
            </div>
            <Loader2
              size={68}
              className="absolute -top-0.5 -left-0.5 text-blue-600 animate-spin opacity-40"
            />
          </div>

          <div className="text-center">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Enterprise Operations Manager
            </h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5 font-medium">
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

  return <Outlet />;
};

export default ProtectedRoute;
