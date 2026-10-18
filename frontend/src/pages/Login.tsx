import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  PackageSearch,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Building2,
  Boxes,
  ShoppingCart,
  Loader2,
  KeyRound,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../services/authApi';
import type { DemoAccount } from '../types/auth';

const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(true);

  // Where to redirect after login (default to dashboard /)
  const from = (location.state as any)?.from?.pathname || '/';

  // Fetch demo accounts for 1-click access
  useEffect(() => {
    let isMounted = true;
    authApi
      .getDemoAccounts()
      .then((data) => {
        if (isMounted) setDemoAccounts(data);
      })
      .catch(() => {
        if (isMounted) {
          setDemoAccounts([
            {
              id: 7,
              name: 'Himanshu Singh',
              email: 'himanshu123@gmail.com',
              role_name: 'Administrator',
              department: 'Executive',
              avatar_color: 'purple',
              password_hint: 'admin123',
            },
            {
              id: 2,
              name: 'Neha Verma',
              email: 'neha.verma@eom.com',
              role_name: 'Inventory Manager',
              department: 'Logistics & Warehouse',
              avatar_color: 'blue',
              password_hint: 'password',
            },
            {
              id: 3,
              name: 'Rajesh Sharma',
              email: 'rajesh.sharma@eom.com',
              role_name: 'Procurement Specialist',
              department: 'Procurement',
              avatar_color: 'indigo',
              password_hint: 'password',
            },
            {
              id: 4,
              name: 'Amit Patel',
              email: 'amit.patel@eom.com',
              role_name: 'Sales & Order Executive',
              department: 'Sales & Fulfillment',
              avatar_color: 'emerald',
              password_hint: 'password',
            },
          ]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingDemos(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // If already authenticated and not loading, redirect to target or dashboard
  if (isAuthenticated && !authLoading) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.warning('Please enter both your work email and password.', 'Required Fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedUser = await login({
        email: email.trim(),
        password: password.trim(),
        rememberMe,
      });

      toast.success(
        `Welcome back, ${loggedUser.name}! Authorized as ${loggedUser.role_name}.`,
        'Authentication Successful'
      );
      navigate(from, { replace: true });
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail ||
        'Unable to authenticate. Please check your email and password.';
      toast.error(errorMsg, 'Login Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemo = async (demo: DemoAccount) => {
    setEmail(demo.email);
    setPassword(demo.password_hint);
    setIsSubmitting(true);
    try {
      const loggedUser = await login({
        email: demo.email,
        password: demo.password_hint,
        rememberMe: true,
      });
      toast.success(
        `Signed in as ${loggedUser.name} (${loggedUser.role_name}).`,
        '1-Click Access'
      );
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail || 'Demo sign-in failed. Please try manual entry.',
        'Sign In Error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName) {
      case 'Administrator':
        return {
          icon: <ShieldCheck size={16} className="text-purple-600" />,
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'Inventory Manager':
        return {
          icon: <Boxes size={16} className="text-blue-600" />,
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'Procurement Specialist':
        return {
          icon: <Building2 size={16} className="text-indigo-600" />,
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
        };
      case 'Sales & Order Executive':
        return {
          icon: <ShoppingCart size={16} className="text-emerald-600" />,
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      default:
        return {
          icon: <Sparkles size={16} className="text-slate-600" />,
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
        };
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 relative overflow-hidden select-none">
      {/* Soft Ambient Light Gradient Washes */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-100/40 via-indigo-50/20 to-transparent pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Modern Technical Micro-Dot Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 ring-4 ring-blue-50">
              <PackageSearch size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  EOM Enterprise
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  v2.4 Production
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Unified Inventory, Order Fulfillment & Procurement Management
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Secure Operations Portal Online</span>
          </div>
        </div>

        {/* Dual-Pane Executive White Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
          {/* Left Form Column (7 cols) */}
          <div className="p-6 sm:p-9 lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="space-y-1 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Staff Sign In
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Enter your credentials to access operations or choose a 1-click role.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. himanshu123@gmail.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info(
                          'Demo Credentials: "admin123" for Administrator, or "password" for standard staff.',
                          'Password Assistant'
                        )
                      }
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Options Row */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 accent-blue-600"
                    />
                    <span className="text-xs text-slate-600 font-medium">
                      Keep me signed in
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <Shield size={13} className="text-blue-600" />
                    <span>256-Bit SSL Secured</span>
                  </div>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Security Assurance Note */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Role-Based Access Control Active
              </span>
              <span>Workstation Authorized</span>
            </div>
          </div>

          {/* Right Demo & Role Preset Column (5 cols) */}
          <div className="p-6 sm:p-8 lg:col-span-5 bg-gradient-to-b from-slate-50/90 via-slate-50/60 to-blue-50/30 border-t lg:border-t-0 lg:border-l border-slate-200/80 flex flex-col justify-between space-y-5">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles size={15} className="text-amber-500" />
                  <span>One-Click Demo Access</span>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Instant Test
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mb-3.5 leading-relaxed">
                Click any staff profile to test the application instantly with that role's real permissions:
              </p>

              {/* Role Cards List */}
              {loadingDemos ? (
                <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                  <Loader2 size={15} className="animate-spin text-blue-600" />
                  <span>Loading active roles...</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {demoAccounts.map((demo) => {
                    const style = getRoleBadgeStyle(demo.role_name);
                    return (
                      <button
                        key={demo.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSelectDemo(demo)}
                        className="w-full text-left p-3 rounded-2xl bg-white hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-white border border-slate-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                            {style.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                              {demo.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {demo.email}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${style.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {demo.role_name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Helper Box */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <KeyRound size={14} className="text-blue-600" />
                <span>Enterprise Credentials</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Administrator: <span className="font-mono text-slate-800 font-semibold">admin123</span> &bull; All Other Staff: <span className="font-mono text-slate-800 font-semibold">password</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-slate-500">
            Enterprise Operations Manager &bull; Supply Chain, Inventory & Warehouse Execution System
          </p>
          <p className="text-[11px] text-slate-400">
            Protected by PBKDF2 & HMAC-SHA256 Bearer Token Infrastructure &bull; &copy; {new Date().getFullYear()} All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
