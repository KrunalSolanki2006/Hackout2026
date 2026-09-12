import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Factory,
  ChevronDown,
  User,
  LogOut,
  Plus,
  Menu,
  ShieldCheck,
  Building2,
  Search,
  Bell,
} from 'lucide-react';
import { useFacilityAssessment } from '../../context/FacilityAssessmentContext';

export default function TopNav({ onToggleMobileMenu }) {
  const {
    activeFacility,
    facilities,
    setActiveFacility,
    activeAssessment,
    user,
    logoutUser,
  } = useFacilityAssessment();

  const [facDropdownOpen, setFacDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Toggle & Facility Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Facility Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFacDropdownOpen(!facDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-md bg-[#5546E8]/10 text-[#5546E8] flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 leading-none">
                {activeFacility?.name || 'Select Facility'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-gray-500 capitalize">
                  {activeFacility?.industry || 'Industrial'}
                </span>
                <span className="text-gray-300 text-[10px]">•</span>
                <span className="text-[11px] text-[#5546E8] font-medium capitalize">
                  {activeFacility?.facility_size || 'Medium'}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
          </button>

          {facDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-dropdown p-1.5 z-40 border border-gray-200">
              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 px-2.5 py-1.5">
                Switch Facility
              </p>
              {facilities.map((fac) => (
                <button
                  key={fac.id}
                  onClick={() => {
                    setActiveFacility(fac);
                    setFacDropdownOpen(false);
                    const asmList = JSON.parse(localStorage.getItem('carbotrack_assessments') || '[]');
                    const targetAsm = asmList.find((a) => a.facility_id === fac.id);
                    if (targetAsm) {
                      navigate(`/assessment/${targetAsm.id}/overview`);
                    } else {
                      navigate(`/facility/${fac.id}/intake`);
                    }
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    activeFacility?.id === fac.id
                      ? 'bg-[#5546E8]/10 text-[#5546E8] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{fac.name}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{fac.industry}</span>
                </button>
              ))}

              <div className="mt-1 pt-1 border-t border-gray-100">
                <Link
                  to="/facility/new"
                  onClick={() => setFacDropdownOpen(false)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#5546E8] hover:bg-[#5546E8]/5 flex items-center gap-1.5 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register New Facility</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Search / Filter (subtle, rounded enterprise style) */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search operational lines, hotspots, interventions..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#5546E8] focus:bg-white focus:ring-2 focus:ring-[#5546E8]/10 transition-all"
          />
        </div>
      </div>

      {/* Right: Active Assessment Pill & User Profile */}
      <div className="flex items-center gap-3">
        {/* Assessment Status Pill */}
        {activeAssessment && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                activeAssessment.status === 'complete'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-gray-500 text-[11px]">Assessment:</span>
            <span className="font-mono text-gray-900 text-[11px] font-semibold">
              {activeAssessment.id}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                activeAssessment.status === 'complete'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {activeAssessment.status}
            </span>
          </div>
        )}

        {/* Notifications Icon */}
        <button
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#5546E8] absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        {/* User Profile with Role Badge */}
        <div className="relative flex items-center gap-2">
          <span
            className={`hidden md:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
              user?.role === 'manager'
                ? 'bg-purple-50 text-[#5546E8] border border-purple-200'
                : 'bg-sky-50 text-sky-700 border border-sky-200'
            }`}
          >
            {user?.role === 'manager' ? 'Plant Manager' : 'Plant Employee'}
          </span>

          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="rounded-full hover:ring-2 hover:ring-[#5546E8]/20 transition-all focus:outline-none"
            title={user?.name || 'User Profile'}
            aria-label="User Profile"
          >
            <div className="w-9 h-9 rounded-full bg-[#5546E8]/10 border border-[#5546E8]/20 flex items-center justify-center text-[#5546E8] text-sm font-bold shadow-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 top-full w-56 bg-white rounded-xl shadow-dropdown p-1.5 z-40 border border-gray-200">
              <div className="px-3 py-2 border-b border-gray-100 text-xs">
                <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                <div className="mt-1.5">
                  <span
                    className={`inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      user?.role === 'manager'
                        ? 'bg-purple-100 text-[#5546E8]'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {user?.role === 'manager' ? 'Manager (Full Rights)' : 'Employee (Direct Passcode Access)'}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
