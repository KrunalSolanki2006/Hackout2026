import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TableProperties,
  AlertOctagon,
  Lightbulb,
  Sliders,
  KanbanSquare,
  FileText,
  PlusCircle,
  Activity,
  X,
  Layers,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useFacilityAssessment } from '../../context/FacilityAssessmentContext';

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const { activeFacility, activeAssessment, user } = useFacilityAssessment();

  const facilityId = activeFacility?.id || 'fac-abc-001';
  const assessmentId = activeAssessment?.id || 'asm-abc-001';
  const isManager = user?.role === 'manager';

  const navGroups = [
    {
      group: 'Analytics & Audits',
      items: [
        {
          label: 'Overview',
          to: `/assessment/${assessmentId}/overview`,
          icon: LayoutDashboard,
        },
        {
          label: 'Emission Analysis',
          to: `/assessment/${assessmentId}/emissions`,
          icon: TableProperties,
        },
        {
          label: 'Leak-Point Diagnostics',
          to: `/assessment/${assessmentId}/leak-points`,
          icon: AlertOctagon,
        },
      ],
    },
    {
      group: 'Interventions & Action',
      items: [
        {
          label: 'Recommendations',
          to: `/assessment/${assessmentId}/recommendations`,
          icon: Lightbulb,
        },
        {
          label: 'What-If Simulator',
          to: `/assessment/${assessmentId}/simulate`,
          icon: Sliders,
        },
        {
          label: 'Action Roadmap',
          to: `/assessment/${assessmentId}/roadmap`,
          icon: KanbanSquare,
        },
      ],
    },
    {
      group: 'Reporting & Compliance',
      items: [
        {
          label: 'Reports & History',
          to: `/facility/${facilityId}/reports`,
          icon: FileText,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#080B20] text-slate-300 w-64 border-r border-[#1E2548]">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#1E2548]/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5546E8] flex items-center justify-center text-white shadow-md shadow-[#5546E8]/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">CarboTrack</h1>
            <p className="text-[10px] text-[#8A92A6] font-medium tracking-wide">
              Carbon SaaS Intelligence
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Guided Intake CTA Button */}
      <div className="p-4 border-b border-[#1E2548]/50">
        <NavLink
          to={`/facility/${facilityId}/intake`}
          onClick={onCloseMobile}
          className={`w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-white text-xs font-semibold shadow-sm transition-all duration-150 ${
            isManager
              ? 'bg-[#5546E8] hover:bg-[#4335D6]'
              : 'bg-[#1E2548] hover:bg-[#252E58] border border-[#2D3766]'
          }`}
        >
          <div className="flex items-center gap-2">
            {isManager ? (
              <PlusCircle className="w-4 h-4 text-white" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400" />
            )}
            <span>{isManager ? 'New Assessment Intake' : 'Assessment Intake'}</span>
          </div>
          <span
            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold tracking-wider ${
              isManager
                ? 'bg-white/20 text-white'
                : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
            }`}
          >
            {isManager ? 'Manager' : 'Protected'}
          </span>
        </NavLink>
      </div>

      {/* Nav Groups List */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((grp, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8A92A6] mb-1.5">
              {grp.group}
            </p>
            {grp.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-[#5546E8] text-white font-semibold shadow-sm shadow-[#5546E8]/20'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/5 font-medium'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Current Authenticated User & System Status */}
      <div className="p-4 border-t border-[#1E2548]/70 bg-[#060818] text-[11px] text-[#8A92A6] space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2548]/40">
          <div className="flex items-center gap-2 truncate">
            <div className="w-6 h-6 rounded-full bg-[#5546E8]/20 border border-[#5546E8]/40 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-white text-xs font-semibold leading-tight truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] text-[#8A92A6] truncate">{user?.email}</p>
            </div>
          </div>
          <span
            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0 ${
              isManager
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}
          >
            {isManager ? 'Manager' : 'Employee'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>Engine Status</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Deterministic v1.2
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen z-20">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 max-w-xs w-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
