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
  const [email, setEmail] = useState('manager@plant.com');
  const [password, setPassword] = useState('manager123');
  const [role, setRole] = useState('manager');
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
      setError(err.message || 'Authentication failed');
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
            Role-based Access Control: Manager (Full Rights & Intake Security) & Employee (Analytics & Direct Modification via Passcode)
          </p>
        </div>

        {/* 1-Click Evaluation Demo Shortcuts Box */}
        <div className="mt-6 panel-card p-4 border-indigo-100 bg-indigo-50/40 text-xs space-y-2">
          <p className="font-semibold text-[#5546E8] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5546E8]" />
            <span>Hackathon Evaluation 1-Click Role Access:</span>
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleQuickDemo('manager')}
              className="py-2 px-3 rounded-lg bg-[#5546E8] hover:bg-[#4335D6] text-white font-medium text-[11px] transition-colors flex items-center justify-center gap-1 shadow-xs"
            >
              <span>Plant Manager</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleQuickDemo('employee')}
              className="py-2 px-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-[11px] transition-colors flex items-center justify-center gap-1 border border-gray-200 shadow-xs"
            >
              <span>Plant Employee</span>
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
                    placeholder="e.g. Rajesh Mehta"
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
                  placeholder="manager@plant.com or employee@plant.com"
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
                  Assigned User Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="manager">Plant Manager (All Features & Sets Assessment Passcode)</option>
                  <option value="employee">Plant Employee (Analytics & Direct Modification via Passcode)</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {role === 'manager'
                    ? 'Managers have full system rights and define assessment security passcodes.'
                    : 'Employees can access all dashboards and directly modify company assessment data using their password.'}
                </p>
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
                `Register as ${role === 'manager' ? 'Plant Manager' : 'Plant Employee'}`
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
                : 'Need a new user account? Register as Manager or Employee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
