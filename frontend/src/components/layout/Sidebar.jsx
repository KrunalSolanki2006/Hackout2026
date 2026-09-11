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
} from 'lucide-react';
import { useFacilityAssessment } from '../../context/FacilityAssessmentContext';

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const { activeFacility, activeAssessment } = useFacilityAssessment();

  const facilityId = activeFacility?.id || 'fac-abc-001';
  const assessmentId = activeAssessment?.id || 'asm-abc-001';

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
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#5546E8] hover:bg-[#4335D6] text-white text-xs font-semibold shadow-sm transition-all duration-150"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Assessment Intake</span>
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

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#1E2548]/70 bg-[#060818] text-[11px] text-[#8A92A6] space-y-1">
        <div className="flex items-center justify-between">
          <span>Engine Status</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Deterministic v1.2
          </span>
        </div>
        <p className="text-[10px] text-slate-400">ML Ranker & Rule-based Active</p>
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
