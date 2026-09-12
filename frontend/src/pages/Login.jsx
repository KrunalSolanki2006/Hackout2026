import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
  X,
} from 'lucide-react';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';
import { apiClient } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginUser, activeFacility, activeAssessment, addToast } = useFacilityAssessment();

  // Mode detection from URL path or local toggle
  const isInitialSignup = location.pathname === '/signup';
  const [isSignup, setIsSignup] = useState(isInitialSignup);

  useEffect(() => {
    setIsSignup(location.pathname === '/signup');
  }, [location.pathname]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('manager@plant.com');
  const [password, setPassword] = useState('manager123');
  const [role, setRole] = useState('manager');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset Password Dialog State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const toggleMode = (targetSignup) => {
    setIsSignup(targetSignup);
    setError(null);
    if (targetSignup) {
      navigate('/signup', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let res;
      if (isSignup) {
        res = await apiClient.signup({ name: name || 'Operations Lead', email, password, role });
      } else {
        res = await apiClient.login(email, password);
      }

      if (res?.data?.user && res?.data?.token) {
        const userWithPwd = { ...res.data.user, password };
        loginUser(userWithPwd, res.data.token);

        if (activeAssessment?.id) {
          navigate(`/assessment/${activeAssessment.id}/overview`);
        } else if (activeFacility?.id) {
          if (userWithPwd.role === 'manager') {
            navigate(`/facility/${activeFacility.id}/intake`);
          } else {
            navigate(`/assessment/asm-abc-001/overview`);
          }
        } else {
          navigate(userWithPwd.role === 'manager' ? '/facility/new' : '/assessment/asm-abc-001/overview');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoRole) => {
    const asmId = activeAssessment?.id || 'asm-abc-001';
    if (demoRole === 'manager') {
      setEmail('manager@plant.com');
      setPassword('manager123');
      setRole('manager');
      loginUser(
        {
          id: 'usr-mgr-01',
          name: 'Rajesh Mehta (Plant Manager)',
          email: 'manager@plant.com',
          role: 'manager',
          password: 'manager123',
        },
        'mock-jwt-token-manager'
      );
    } else {
      setEmail('employee@plant.com');
      setPassword('employee123');
      setRole('employee');
      loginUser(
        {
          id: 'usr-emp-01',
          name: 'Ananya Roy (Process Employee)',
          email: 'employee@plant.com',
          role: 'employee',
          password: 'employee123',
        },
        'mock-jwt-token-employee'
      );
    }

    navigate(`/assessment/${asmId}/overview`);
  };

  const handlePasswordResetSubmit = (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetSent(true);
    setTimeout(() => {
      setShowResetModal(false);
      setResetSent(false);
      setResetEmail('');
      if (addToast) {
        addToast('Password reset instructions sent to your email.');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] via-[#F8FAFC] to-[#F1F5F9] flex flex-col justify-between relative overflow-x-hidden font-sans text-gray-800">
      {/* Subtle Background Floating Ambient Glowing Orbs */}
      <div className="absolute top-12 left-1/4 w-80 h-80 rounded-full bg-indigo-200/35 blur-3xl pointer-events-none animate-float-slow -z-0" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-purple-200/30 blur-3xl pointer-events-none animate-pulse-subtle -z-0" />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP NAVIGATION BAR                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="w-full px-6 py-5 flex items-center justify-between relative z-20 max-w-7xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white/60 hover:bg-white px-3 py-1.5 rounded-full border border-gray-200/70 shadow-xs backdrop-blur-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Center Brand Identity */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#5546E8] flex items-center justify-center text-white shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900">
            Carbo<span className="text-[#5546E8]">Track</span>
          </span>
        </div>

        {/* Right Help / Status */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Online</span>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. CENTERED AUTHENTICATION CARD WITH POP-UP ANIMATION         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div
          key={isSignup ? 'signup-card' : 'login-card'}
          className="w-full max-w-[430px] animate-form-popup"
        >
          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/70 border border-gray-100 p-7 sm:p-9 relative pt-11 transition-all">
            {/* Top Elevated Icon Emblem */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-white border border-gray-200/80 shadow-md flex items-center justify-center text-[#5546E8] ring-6 ring-[#F0F4FF] transition-transform duration-200 hover:scale-105">
              {isSignup ? (
                <UserPlus className="w-6 h-6 text-[#5546E8]" />
              ) : (
                <Lock className="w-6 h-6 text-[#5546E8]" />
              )}
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isSignup ? 'Create Account' : 'Login'}
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-normal">
                {isSignup
                  ? 'Join CarboTrack to calculate emissions & circular fixes'
                  : 'Enter your credentials to access the platform'}
              </p>
            </div>

            {error && <ErrorBanner message={error} className="mb-4 text-xs" />}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (Sign Up only) */}
              {isSignup && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#5546E8] focus:ring-2 focus:ring-[#5546E8]/10 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Username / Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {isSignup ? 'Work Email' : 'Username or Email'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isSignup ? 'Enter your work email' : 'Enter your email or username'}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#5546E8] focus:ring-2 focus:ring-[#5546E8]/10 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-white border border-gray-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#5546E8] focus:ring-2 focus:ring-[#5546E8]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Role Selection (Sign Up only) */}
              {isSignup && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Facility Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#5546E8] focus:ring-2 focus:ring-[#5546E8]/10 transition-all"
                  >
                    <option value="manager">Plant Manager (Full Privileges & Passcode)</option>
                    <option value="employee">Operations Engineer / Employee</option>
                  </select>
                </div>
              )}

              {/* Helper Links Row (Create Account / Reset Password) */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <button
                  type="button"
                  onClick={() => toggleMode(!isSignup)}
                  className="font-semibold text-[#5546E8] hover:text-[#4335D6] transition-colors"
                >
                  {isSignup ? 'Already have an account?' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Reset Password
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5546E8] hover:bg-[#4335D6] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-[#5546E8]/20 hover:shadow-lg hover:shadow-[#5546E8]/30 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{isSignup ? 'Create Account' : 'Login'}</span>
                )}
              </button>
            </form>

            {/* Quick Demo Evaluation Drawer (For Hackathon Reviewers) */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100/80">
                <p className="text-[11px] font-bold text-[#5546E8] flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3 h-3 text-[#5546E8]" />
                  <span>1-Click Hackathon Evaluator Access:</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('manager')}
                    className="bg-white hover:bg-indigo-50/80 text-[#5546E8] border border-indigo-200 font-semibold py-1.5 px-2 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span>Plant Manager</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('employee')}
                    className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-1.5 px-2 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span>Operations Staff</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CLEAN FOOTER                                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <footer className="w-full py-5 text-center text-xs text-gray-400 relative z-20 border-t border-gray-200/60 bg-white/30 backdrop-blur-xs">
        <p>© 2026 CarboTrack • Renewable Energy & Circular Carbon Ecosystem</p>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. PASSWORD RESET MODAL                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative border border-gray-100 animate-popup">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5546E8] flex items-center justify-center mb-3">
              <KeyRound className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-gray-900">Reset Password</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Enter your registered work email to receive password recovery instructions.
            </p>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="work.email@facility.com"
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#5546E8] focus:ring-2 focus:ring-[#5546E8]/10"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#5546E8] hover:bg-[#4335D6] text-white rounded-lg font-medium transition-colors"
                >
                  {resetSent ? 'Sent!' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
