import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  KanbanSquare,
  Table,
  CheckCircle2,
  Clock,
  IndianRupee,
  Leaf,
  Trash2,
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import { useRoadmap } from '../hooks/useRoadmap';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';

export default function ActionRoadmap() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeAssessment, activeFacility, addToast } = useFacilityAssessment();

  const assessmentId = id || activeAssessment?.id || 'asm-abc-001';
  const { roadmap, loading, error, refetch, updateItem, removeItem } = useRoadmap(assessmentId);

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'

  const totalInterventions =
    (roadmap.phase_1?.length || 0) +
    (roadmap.phase_2?.length || 0) +
    (roadmap.phase_3?.length || 0);

  const handlePhaseChange = async (appliedId, newPhase) => {
    try {
      await updateItem(appliedId, { roadmap_phase: newPhase });
      addToast(`Moved intervention to Phase ${newPhase}`);
    } catch (e) {
      addToast('Failed to change phase', 'error');
    }
  };

  const handleStatusChange = async (appliedId, newStatus) => {
    try {
      await updateItem(appliedId, { status: newStatus });
      addToast(`Status updated to "${newStatus.replace('_', ' ')}"`);
    } catch (e) {
      addToast('Failed to update status', 'error');
    }
  };

  const handleRemove = async (appliedId) => {
    try {
      await removeItem(appliedId);
      addToast('Intervention removed from roadmap');
    } catch (e) {
      addToast('Failed to remove item', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        title="Failed to Load Action Roadmap"
        message={error}
        onRetry={refetch}
      />
    );
  }

  const phasesConfig = [
    {
      key: 'phase_1',
      phaseNum: 1,
      title: 'Phase 1: Quick Wins',
      subtitle: 'Fast ROI (<12 mo) • Low Implementation Effort',
      borderColor: 'border-t-emerald-500',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      items: roadmap.phase_1 || [],
    },
    {
      key: 'phase_2',
      phaseNum: 2,
      title: 'Phase 2: Medium Term',
      subtitle: 'Payback 12–24 mo • Process & Material Retrofits',
      borderColor: 'border-t-amber-500',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      items: roadmap.phase_2 || [],
    },
    {
      key: 'phase_3',
      phaseNum: 3,
      title: 'Phase 3: Long Term',
      subtitle: 'Strategic Decarbonization • High Capex / Solar & BESS',
      borderColor: 'border-t-[#5546E8]',
      badgeColor: 'bg-purple-50 text-[#5546E8] border-purple-200',
      items: roadmap.phase_3 || [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-[#5546E8] border border-purple-200/80 font-mono flex items-center gap-1">
              <KanbanSquare className="w-3 h-3 text-[#5546E8]" />
              <span>Phased Implementation</span>
            </span>
            <span className="text-xs text-gray-500 font-mono">Assessment: {assessmentId}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Carbon Reduction Phased Action Roadmap
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Turn diagnostic recommendations into an actionable 3-phase execution timeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-gray-100 border border-gray-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Kanban Board"
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Flat Table"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          <Link
            to={`/assessment/${assessmentId}/recommendations`}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#5546E8]" />
            <span>Add More Interventions</span>
          </Link>
        </div>
      </div>

      {totalInterventions === 0 ? (
        <EmptyState
          title="Action Roadmap Is Empty"
          description="Apply candidate interventions from the Recommendations Dashboard or What-If Simulator to generate your phased execution plan."
          actionLabel="Explore Recommendations"
          onAction={() => navigate(`/assessment/${assessmentId}/recommendations`)}
        />
      ) : viewMode === 'kanban' ? (
        /* 3-Column Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {phasesConfig.map((phase) => {
            const phaseCost = phase.items.reduce((acc, i) => acc + (i.cost || 0), 0);
            const phaseCo2 = phase.items.reduce((acc, i) => acc + (i.co2_reduction || 0), 0);

            return (
              <div
                key={phase.key}
                className={`panel-card p-4 flex flex-col justify-between border-t-4 ${phase.borderColor}`}
              >
                <div>
                  {/* Phase Column Header */}
                  <div className="border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${phase.badgeColor}`}>
                        Phase {phase.phaseNum}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {phase.items.length} {phase.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mt-1.5">{phase.title}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">{phase.subtitle}</p>

                    {/* Phase Subtotals */}
                    <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-gray-100 font-mono">
                      <span className="text-emerald-600 font-semibold">
                        -{phaseCo2} t CO₂e/yr
                      </span>
                      <span className="text-gray-700 font-medium">
                        ₹{phaseCost.toLocaleString()} capex
                      </span>
                    </div>
                  </div>

                  {/* Cards inside Phase */}
                  <div className="space-y-3 min-h-[220px]">
                    {phase.items.length === 0 ? (
                      <div className="h-32 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400 bg-gray-50/50">
                        No interventions in this phase
                      </div>
                    ) : (
                      phase.items.map((item) => (
                        <div
                          key={item.applied_intervention_id}
                          className="p-3.5 rounded-lg bg-gray-50/80 border border-gray-200/80 hover:border-gray-300 hover:bg-white hover:shadow-xs transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-gray-900 leading-snug">
                              {item.name}
                            </h4>
                            <span className="text-[10px] uppercase font-bold text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-2xs">
                              {item.priority}
                            </span>
                          </div>

                          {/* Quick Metrics */}
                          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-600 pt-1 font-mono">
                            <div className="flex items-center gap-1">
                              <Leaf className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>-{item.co2_reduction} t/yr</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <IndianRupee className="w-3 h-3 text-[#5546E8] shrink-0" />
                              <span>₹{item.cost.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{item.payback_period_months} mo</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 capitalize">{item.difficulty}</span>
                            </div>
                          </div>

                          {/* Status and Action Row */}
                          <div className="pt-2 border-t border-gray-200/70 flex items-center justify-between gap-1 text-[11px]">
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleStatusChange(item.applied_intervention_id, e.target.value)
                              }
                              className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[11px] text-gray-700 focus:outline-none focus:border-[#5546E8] focus:ring-1 focus:ring-[#5546E8]/20 capitalize shadow-2xs"
                            >
                              <option value="planned">Planned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>

                            <div className="flex items-center gap-1">
                              {/* Move phase buttons */}
                              {[1, 2, 3].map((pNum) => {
                                if (pNum === phase.phaseNum) return null;
                                return (
                                  <button
                                    key={pNum}
                                    onClick={() =>
                                      handlePhaseChange(item.applied_intervention_id, pNum)
                                    }
                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 text-[10px] font-mono border border-gray-200 transition-colors"
                                    title={`Move to Phase ${pNum}`}
                                  >
                                    P{pNum}
                                  </button>
                                );
                              })}

                              <button
                                onClick={() => handleRemove(item.applied_intervention_id)}
                                className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 ml-1 transition-colors"
                                title="Remove from roadmap"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat Table View */
        <div className="panel-card overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Phase</th>
                  <th className="py-3 px-4">Intervention</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3 text-right">Reduction</th>
                  <th className="py-3 px-3 text-right">Capex</th>
                  <th className="py-3 px-3 text-right">Payback</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {phasesConfig.flatMap((p) =>
                  p.items.map((item) => (
                    <tr key={item.applied_intervention_id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#5546E8]">
                        Phase {p.phaseNum}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold text-gray-500">
                        {item.priority}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 font-semibold">
                        -{item.co2_reduction} t/yr
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        ₹{item.cost.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-600 font-semibold">
                        {item.payback_period_months} mo
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-100 border border-gray-200 text-gray-700">
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRemove(item.applied_intervention_id)}
                          className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
