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
  Lock,
  PanelLeftClose,
} from 'lucide-react';
import { useFacilityAssessment } from '../../context/FacilityAssessmentContext';

export default function Sidebar({
  mobileOpen = false,
  onCloseMobile,
  collapsed = false,
  onToggleCollapse,
}) {
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
    <div
      className={`flex flex-col h-full bg-[#080B20] text-slate-300 border-r border-[#1E2548] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. BRAND HEADER & SHRINK / EXPAND TOGGLE                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className={`h-16 flex items-center border-b border-[#1E2548]/70 px-4 transition-all duration-300 ${
          collapsed ? 'justify-center relative' : 'justify-between'
        }`}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-[#5546E8] flex items-center justify-center text-white shadow-md shadow-[#5546E8]/30 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">CarboTrack</h1>
              <p className="text-[10px] text-[#8A92A6] font-medium tracking-wide truncate">
                Carbon SaaS Intelligence
              </p>
            </div>
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-xl bg-[#5546E8] flex items-center justify-center text-white shadow-md shadow-[#5546E8]/30 shrink-0 cursor-pointer hover:scale-105 transition-transform"
            onClick={onToggleCollapse}
            title="Expand Sidebar"
          >
            <Activity className="w-5 h-5" />
          </div>
        )}

        {/* Desktop Shrink Toggle Button (when expanded) */}
        {!collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Shrink sidebar to icons"
            aria-label="Shrink sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}



        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
            aria-label="Close mobile sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. GUIDED INTAKE CTA BUTTON                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`p-3 border-b border-[#1E2548]/50 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <NavLink
            to={`/facility/${facilityId}/intake`}
            onClick={onCloseMobile}
            className={`w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-white text-xs font-semibold shadow-sm transition-all duration-150 ${
              isManager
                ? 'bg-[#5546E8] hover:bg-[#4335D6]'
                : 'bg-[#1E2548] hover:bg-[#252E58] border border-[#2D3766]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {isManager ? (
                <PlusCircle className="w-4 h-4 text-white shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="truncate">
                {isManager ? 'New Assessment Intake' : 'Assessment Intake'}
              </span>
            </div>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0 ${
                isManager
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
              }`}
            >
              {isManager ? 'Manager' : 'Protected'}
            </span>
          </NavLink>
        ) : (
          <NavLink
            to={`/facility/${facilityId}/intake`}
            onClick={onCloseMobile}
            title={isManager ? 'New Assessment Intake (Manager)' : 'Assessment Intake (Protected)'}
            className={`w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-sm transition-all duration-150 ${
              isManager
                ? 'bg-[#5546E8] hover:bg-[#4335D6] hover:scale-105'
                : 'bg-[#1E2548] hover:bg-[#252E58] border border-[#2D3766]'
            }`}
          >
            {isManager ? (
              <PlusCircle className="w-5 h-5 text-white" />
            ) : (
              <Lock className="w-5 h-5 text-amber-400" />
            )}
          </NavLink>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. NAVIGATION GROUPS & ICON BUTTONS                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2.5 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
        {navGroups.map((grp, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed ? (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white mb-1.5 truncate">
                {grp.group}
              </p>
            ) : (
              idx > 0 && <div className="h-px bg-[#1E2548]/80 mx-2 my-2" />
            )}

            {grp.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-xs transition-all duration-150 relative group ${
                      collapsed
                        ? `justify-center w-10 h-10 mx-auto ${
                            isActive
                              ? 'bg-[#5546E8] text-white font-semibold shadow-md shadow-[#5546E8]/30 ring-2 ring-[#5546E8]/40'
                              : 'text-[#94A3B8] hover:text-white hover:bg-white/10 font-medium'
                          }`
                        : `gap-3 px-3 py-2 ${
                            isActive
                              ? 'bg-[#5546E8] text-white font-semibold shadow-sm shadow-[#5546E8]/20'
                              : 'text-[#94A3B8] hover:text-white hover:bg-white/5 font-medium'
                          }`
                    }`
                  }
                >
                  <Icon className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}

                  {/* Floating Hover Tooltip when sidebar is collapsed */}
                  {collapsed && (
                    <span className="fixed left-20 px-2.5 py-1 bg-[#131A38] text-white text-[11px] font-semibold rounded-md shadow-xl border border-[#1E2548] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 ml-2">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
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
