import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';
import { apiClient } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('priya.sharma@abcplastics.in');
  const [password, setPassword] = useState('demo1234');
  const [role, setRole] = useState('operator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { loginUser, activeFacility, activeAssessment } = useFacilityAssessment();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let res;
      if (isSignup) {
        res = await apiClient.signup({ name, email, password, role });
      } else {
        res = await apiClient.login(email, password);
      }

      if (res?.data?.user && res?.data?.token) {
        loginUser(res.data.user, res.data.token);
        if (activeAssessment?.id) {
          navigate(`/assessment/${activeAssessment.id}/overview`);
        } else if (activeFacility?.id) {
          navigate(`/facility/${activeFacility.id}/intake`);
        } else {
          navigate('/facility/new');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoRole) => {
    if (demoRole === 'operator') {
      setEmail('priya.sharma@abcplastics.in');
      setPassword('demo1234');
      setRole('operator');
      loginUser(
        {
          id: 'usr-001',
          name: 'Priya Sharma (Plant Operations)',
          email: 'priya.sharma@abcplastics.in',
          role: 'operator',
        },
        'mock-jwt-token-carbotrack-2026'
      );
    } else {
      setEmail('consultant@circularearth.org');
      setPassword('demo1234');
      setRole('consultant');
      loginUser(
        {
          id: 'usr-002',
          name: 'Vikram Joshi (Senior ESG Auditor)',
          email: 'consultant@circularearth.org',
          role: 'consultant',
        },
        'mock-jwt-token-carbotrack-2026'
      );
    }

    const asmId = activeAssessment?.id || 'asm-abc-001';
    navigate(`/assessment/${asmId}/overview`);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#5546E8] flex items-center justify-center text-white shadow-md shadow-[#5546E8]/30 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">CarboTrack</h1>
          <p className="text-xs text-[#5546E8] font-semibold uppercase tracking-widest mt-1">
            Industrial Carbon Intelligence Platform
          </p>
          <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
            Deterministic emission calculations and ML circular recommendations for SME manufacturing
          </p>
        </div>

        {/* 1-Click Evaluation Demo Shortcuts Box */}
        <div className="mt-6 panel-card p-4 border-indigo-100 bg-indigo-50/40 text-xs space-y-2">
          <p className="font-semibold text-[#5546E8] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5546E8]" />
            <span>Hackathon Evaluation 1-Click Access:</span>
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleQuickDemo('operator')}
              className="py-2 px-3 rounded-lg bg-[#5546E8] hover:bg-[#4335D6] text-white font-medium text-[11px] transition-colors flex items-center justify-center gap-1 shadow-xs"
            >
              <span>ABC Plastics Operator</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleQuickDemo('consultant')}
              className="py-2 px-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-[11px] transition-colors flex items-center justify-center gap-1 border border-gray-200 shadow-xs"
            >
              <span>ESG Consultant</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="mt-4 panel-card p-6 sm:p-8 shadow-card">
          {error && <ErrorBanner message={error} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="input-field pl-9 text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@plant.com"
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>

            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-field text-xs capitalize"
                >
                  <option value="operator">Plant Operator / Factory Manager</option>
                  <option value="consultant">ESG Consultant / Circular Auditor</option>
                  <option value="regulator">Industry Compliance Regulator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-semibold mt-2"
            >
              {loading ? (
                'Processing...'
              ) : isSignup ? (
                'Create CarboTrack Account'
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError(null);
              }}
              className="text-xs text-[#5546E8] hover:text-[#4335D6] font-semibold transition-colors"
            >
              {isSignup
                ? 'Already have an account? Sign in'
                : "Need a new facility account? Register here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
