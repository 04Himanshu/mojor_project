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
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';

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
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

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
          icon: <ShieldCheck size={16} className="text-purple-600 dark:text-purple-400" />,
          badge: 'badge-purple',
          dot: 'bg-purple-500',
        };
      case 'Inventory Manager':
        return {
          icon: <Boxes size={16} className="text-blue-600 dark:text-blue-400" />,
          badge: 'badge-info',
          dot: 'bg-blue-500',
        };
      case 'Procurement Specialist':
        return {
          icon: <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />,
          badge: 'badge-neutral',
          dot: 'bg-indigo-500',
        };
      case 'Sales & Order Executive':
        return {
          icon: <ShoppingCart size={16} className="text-emerald-600 dark:text-emerald-400" />,
          badge: 'badge-success',
          dot: 'bg-emerald-500',
        };
      default:
        return {
          icon: <Sparkles size={16} className="text-slate-600 dark:text-slate-400" />,
          badge: 'badge-neutral',
          dot: 'bg-slate-500',
        };
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 relative overflow-hidden select-none transition-colors">
      {/* Soft Ambient Light Gradient Washes */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-100/40 dark:from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black text-sm">
              <PackageSearch size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  EOM Enterprise
                </span>
                <span className="badge-info text-[10px]">
                  v2.4 Production
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unified Inventory, Order Fulfillment & Procurement Management
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Secure Operations Portal Online</span>
          </div>
        </div>

        {/* Dual-Pane Executive Card */}
        <div className="bg-white dark:bg-[#101726] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
          {/* Left Form Column (7 cols) */}
          <div className="p-6 sm:p-8 lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="space-y-1 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Staff Sign In
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Enter your credentials to access operations or choose a 1-click role.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="form-label">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. himanshu123@gmail.com"
                      autoComplete="email"
                      className="input-base pl-10"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="form-label mb-0">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="input-base pl-10 pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
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
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-600"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Keep me signed in
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <Shield size={13} className="text-blue-600 dark:text-blue-400" />
                    <span>256-Bit SSL Secured</span>
                  </div>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
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
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Role-Based Access Control Active
              </span>
              <span>Workstation Authorized</span>
            </div>
          </div>

          {/* Right Demo & Role Preset Column (5 cols) */}
          <div className="p-6 sm:p-8 lg:col-span-5 bg-slate-50/50 dark:bg-slate-900/40 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-5">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles size={15} className="text-amber-500" />
                  <span>One-Click Demo Access</span>
                </div>
                <span className="badge-info text-[10px]">
                  Instant Test
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3.5 leading-relaxed">
                Click any staff profile to test the application instantly with that role's real permissions:
              </p>

              {/* Role Cards List */}
              {loadingDemos ? (
                <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                  <Loader2 size={15} className="animate-spin text-blue-600" />
                  <span>Loading active roles...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {demoAccounts.map((demo) => {
                    const style = getRoleBadgeStyle(demo.role_name);
                    return (
                      <button
                        key={demo.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSelectDemo(demo)}
                        className="w-full text-left p-3 rounded-xl bg-white dark:bg-[#141C2E] hover:border-blue-500/50 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow transition-all flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                            {style.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {demo.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {demo.email}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${style.badge}`}
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
            <div className="p-3.5 bg-white dark:bg-[#141C2E] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <KeyRound size={13} className="text-blue-600 dark:text-blue-400" />
                <span>Default Credentials</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Administrator: <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">admin123</span> &bull; All Other Staff: <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">password</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enterprise Operations Manager &bull; Supply Chain, Inventory & Warehouse Execution System
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-600">
            Protected by PBKDF2 & HMAC-SHA256 Bearer Token Infrastructure &bull; &copy; {new Date().getFullYear()} All Rights Reserved
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};

export default Login;
