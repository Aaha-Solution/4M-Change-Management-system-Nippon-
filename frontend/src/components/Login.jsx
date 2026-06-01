import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/apiRoutes';
import bgImage from '../assets/background-image.JPG';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  ArrowRight
} from 'lucide-react';

export const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem('cms_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('cms_remember_me') === 'true');
  const [isLoading, setIsLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('cms_token') || sessionStorage.getItem('cms_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await login({ email: normalizedEmail, password, rememberMe });
      const data = response.data;

      if (rememberMe) {
        localStorage.setItem('cms_remembered_email', email);
        localStorage.setItem('cms_remember_me', 'true');
      } else {
        localStorage.removeItem('cms_remembered_email');
        localStorage.removeItem('cms_remember_me');
      }

      setSuccessMsg(`Welcome back! Authenticating as ${data.role}...`);
      setIsLoading(false);

      setTimeout(() => {
        onLoginSuccess(data.email, data.role, data.token, rememberMe);
        navigate('/dashboard');
      }, 1200);

    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Server error. Please make sure the backend is running.';
      setErrorMsg(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] min-h-screen w-full overflow-hidden font-sans bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Light overlay backdrop for optimal text readability */}
      <div className="absolute inset-0 bg-transparent z-0 pointer-events-none" />

      {/* Left Panel: Animated Change Pipeline */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden z-10">
        {/* Abstract background gradient orbits */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(124,58,237,0.05)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,0.05)_0%,transparent_50%)] pointer-events-none z-0" />
        <div className="absolute -inset-[50%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(124,58,237,0.005)_25%,transparent_50%,rgba(6,182,212,0.005)_75%,transparent_100%)] animate-slow-rotate pointer-events-none z-0" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <GitBranch className="text-[#06b6d4] animate-pulse-glow" size={28} />
          <span className="font-heading text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">4M·CMS</span>
        </div>



        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Change Management System. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Form Side */}
      <div className="relative flex items-center justify-center lg:justify-end lg:pr-[105px] p-4 sm:p-8 z-10">
        <div className="w-full max-w-[400px] animate-fade-in-up">
          <div className="mb-8 px-2 sm:px-0">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-blue-800 text-sm">
              Enter your credentials to manage your requests
            </p>
          </div>

          <div className="relative bg-white/90 border border-slate-200/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl overflow-hidden">
            {/* Glowing border effects */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm mb-5 animate-alert-shake">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm mb-5">
                <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="email">Email Address</label>
                <div className="relative flex items-center">
                  <input
                    id="email"
                    type="email"
                    className="w-full bg-slate-50/80 border border-slate-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder-slate-400 outline-none transition-all text-sm"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  <Mail className="absolute left-4 text-slate-400 focus-within:text-violet-600 pointer-events-none" size={18} />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="password">Password</label>
                <div className="relative flex items-center">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full bg-slate-50/80 border border-slate-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10 rounded-xl py-3 pl-11 pr-11 text-slate-800 placeholder-slate-400 outline-none transition-all text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <Lock className="absolute left-4 text-slate-400 pointer-events-none" size={18} />
                  <button
                    type="button"
                    className="absolute right-4 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  className="w-4 h-4 text-violet-600 bg-slate-50 border-slate-300 rounded focus:ring-violet-500 cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <label htmlFor="rememberMe" className="text-sm text-slate-600 cursor-pointer select-none">
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white font-semibold text-sm rounded-xl transition-all shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.98] cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
