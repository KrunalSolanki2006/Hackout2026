import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Info,
} from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import { useRecommendations } from '../hooks/useRecommendations';
import { useSimulate } from '../hooks/useSimulate';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';
import { apiClient } from '../api/client';

export default function WhatIfSimulator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeAssessment, activeFacility, addToast } = useFacilityAssessment();

  const assessmentId = id || activeAssessment?.id || 'asm-abc-001';

  const { recommendations, loading: recsLoading } = useRecommendations(assessmentId);
  const { result, loading: simLoading, error: simError, simulate } = useSimulate(assessmentId);

  const [selectedIds, setSelectedIds] = useState(() => {
    const pre = searchParams.get('select');
    if (pre) return pre.split(',').filter(Boolean);
    return ['INT-001', 'INT-006'];
  });

  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (selectedIds.length > 0) {
      simulate(selectedIds);
    }
  }, [selectedIds, simulate]);

  const toggleSelection = (recId) => {
    setSelectedIds((prev) =>
      prev.includes(recId) ? prev.filter((i) => i !== recId) : [...prev, recId]
    );
  };

  const selectAll = () => {
    setSelectedIds(recommendations.map((r) => r.recommendation_id));
  };

  const resetSelection = () => {
    setSelectedIds([]);
  };

  const handleApplySelected = async () => {
    if (selectedIds.length === 0) return;
    setApplying(true);
    try {
      for (const recId of selectedIds) {
        await apiClient.applyRecommendation(assessmentId, recId);
      }
      addToast(`Committed ${selectedIds.length} circular interventions to Action Roadmap!`);
      navigate(`/assessment/${assessmentId}/roadmap`);
    } catch (e) {
      addToast('Failed to commit interventions', 'error');
    } finally {
      setApplying(false);
    }
  };

  if (recsLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  const comparisonChartData = result
    ? [
        {
          name: 'Baseline Footprint',
          emissions: result.current_co2e,
          type: 'current',
        },
        {
          name: 'Projected Emissions',
          emissions: result.projected_co2e,
          type: 'projected',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-[#5546E8] border border-indigo-100 font-mono flex items-center gap-1 whitespace-nowrap">
              <Sliders className="w-3 h-3 text-[#5546E8]" />
              <span>Interactive Simulator</span>
            </span>
            <span className="text-xs text-gray-400 font-mono whitespace-nowrap">Assessment: {assessmentId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            What-If Scenario Simulator & Carbon Delta
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Model combined emission avoidance, investment capex, and payback timeline across candidate interventions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <button
            onClick={resetSelection}
            disabled={selectedIds.length === 0}
            className="btn-secondary h-9 px-3.5 text-xs font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-lg shrink-0"
            title="Reset selections"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Reset</span>
          </button>
          <button
            onClick={handleApplySelected}
            disabled={selectedIds.length === 0 || applying}
            className="btn-primary h-9 px-4 text-xs font-medium whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-lg shrink-0"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">
              {applying ? 'Committing...' : `Apply Selected (${selectedIds.length})`}
            </span>
          </button>
        </div>
      </div>

      {simError && <ErrorBanner message={simError} />}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Selection Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="panel-card p-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Candidate Interventions</h3>
                <p className="text-[11px] text-gray-400">
                  Toggle checkboxes to recalculate projections
                </p>
              </div>
              <button
                onClick={selectAll}
                className="text-xs text-[#5546E8] hover:text-[#4335D6] font-semibold"
              >
                Select All
              </button>
            </div>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {recommendations.map((rec) => {
                const isChecked = selectedIds.includes(rec.recommendation_id);
                const isOverlapCandidate =
                  selectedIds.length > 1 &&
                  recommendations.filter(
                    (r) =>
                      selectedIds.includes(r.recommendation_id) &&
                      r.applicable_leak_point === rec.applicable_leak_point
                  ).length > 1;

                return (
                  <label
                    key={rec.recommendation_id}
                    className={`block p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-indigo-50/40 border-[#5546E8]/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelection(rec.recommendation_id)}
                        className="mt-1 rounded border-gray-300 text-[#5546E8] focus:ring-[#5546E8] w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-900 truncate mr-2">
                            {rec.intervention?.name}
                          </p>
                          <span className="text-xs font-mono font-bold text-[#5546E8] shrink-0">
                            {rec.score}/100
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-1">
                          <span className="text-emerald-700 font-medium font-mono">
                            ~{(rec.estimated_co2_reduction_range[0] + rec.estimated_co2_reduction_range[1]) / 2} t CO₂e/yr
                          </span>
                          <span>•</span>
                          <span className="text-gray-700 font-mono">
                            ₹{((rec.estimated_cost_range[0] + rec.estimated_cost_range[1]) / 2).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">{rec.payback_period_months} mo payback</span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                            {rec.applicable_leak_point}
                          </span>
                          {isOverlapCandidate && isChecked && (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Shared Hotspot
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Calculated Projections (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedIds.length === 0 ? (
            <EmptyState
              title="No Interventions Selected"
              description="Select one or more circular alternatives on the left to simulate your projected carbon delta, payback, and capex requirement."
              actionLabel="Select Top 2 Interventions"
              onAction={() => setSelectedIds(['INT-001', 'INT-006'])}
            />
          ) : (
            <>
              {/* Top Projected Metrics Summary */}
              <div className="panel-card p-5">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5546E8] font-mono">
                      Projected Modeling
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 mt-0.5">
                      Combined Impact of {selectedIds.length} Interventions
                    </h3>
                  </div>
                  {simLoading && (
                    <span className="text-xs text-[#5546E8] animate-pulse font-medium">
                      Recalculating...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[11px] text-gray-500 block">Projected CO₂e</span>
                    <p className="text-lg font-bold font-mono text-[#5546E8] mt-0.5">
                      {result?.projected_co2e} <span className="text-xs font-normal text-gray-500">t</span>
                    </p>
                    <span className="text-[10px] text-gray-400">
                      Down from {result?.current_co2e} t
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[11px] text-gray-500 block">CO₂ Reduction</span>
                    <p className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                      -{result?.reduction_abs} <span className="text-xs font-normal text-gray-500">t/yr</span>
                    </p>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      -{Math.round((result?.reduction_pct || 0) * 100)}% total
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[11px] text-gray-500 block">Total Investment</span>
                    <p className="text-lg font-bold font-mono text-gray-900 mt-0.5">
                      ₹{result?.investment?.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-gray-400">Additive Capex</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[11px] text-gray-500 block">Blended Payback</span>
                    <p className="text-lg font-bold font-mono text-amber-700 mt-0.5">
                      {result?.payback_period_months} <span className="text-xs font-normal text-gray-500">mo</span>
                    </p>
                    <span className="text-[10px] text-purple-700 font-semibold">
                      +{result?.roi_pct}% ROI
                    </span>
                  </div>
                </div>
              </div>

              {/* Before vs. After Comparison Bar Chart */}
              <div className="panel-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Baseline vs. Projected Footprint</h3>
                    <p className="text-xs text-gray-500">
                      Net annual reduction: {result?.reduction_abs} t CO₂e
                    </p>
                  </div>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonChartData}
                      margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
                    >
                      <XAxis dataKey="name" tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 500 }} />
                      <YAxis
                        unit=" t"
                        domain={[0, 'dataMax + 20']}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white border border-gray-200 p-2.5 rounded-xl shadow-dropdown text-xs">
                                <p className="font-semibold text-gray-900">{d.name}</p>
                                <p className="font-mono text-[#5546E8] font-bold mt-0.5">
                                  {d.emissions} tonnes CO₂e
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="emissions" radius={[6, 6, 0, 0]}>
                        {comparisonChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.type === 'current' ? '#F59E0B' : '#5546E8'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Overlap Adjustments Warning Notes */}
              {result?.overlap_adjustments && result.overlap_adjustments.length > 0 && (
                <div className="panel-card p-4 border-amber-200 bg-amber-50/50 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Double-Counting Prevention (Max-Per-Leak-Point Rule):</span>
                  </div>
                  {result.overlap_adjustments.map((adj, i) => (
                    <p key={i} className="text-amber-800 pl-6 leading-relaxed">
                      {adj.note}
                    </p>
                  ))}
                </div>
              )}

              {/* Financial & Trust Separation Notice */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Trust Tier Separation:</strong> Baseline emissions (
                  {result?.current_co2e} t) are certified by the deterministic engine. Projected reductions are calculated from curated intervention library ranges without double-counting.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
