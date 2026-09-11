import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Filter,
} from 'lucide-react';
import RankedBarChart from '../components/RankedBarChart';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import { useLeakPoints } from '../hooks/useLeakPoints';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';

export default function LeakPointDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeAssessment, activeFacility } = useFacilityAssessment();

  const assessmentId = id || activeAssessment?.id || 'asm-abc-001';
  const { leakPoints, loading, error, refetch } = useLeakPoints(assessmentId);
  const [severityFilter, setSeverityFilter] = useState('all');

  const filteredLeakPoints = leakPoints.filter((lp) => {
    if (severityFilter !== 'all' && lp.severity !== severityFilter) return false;
    return true;
  });

  const handleSelectLeakPoint = (leakPointRef) => {
    navigate(`/assessment/${assessmentId}/recommendations?leak_point=${leakPointRef}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="chart" />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        title="Failed to Load Leak-Point Diagnostics"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!leakPoints || leakPoints.length === 0) {
    return (
      <EmptyState
        title="No Hotspots Identified"
        description="Run an assessment calculation to automatically rank process emission hotspots."
        actionLabel="Start Guided Intake"
        onAction={() => navigate(`/facility/${activeFacility?.id || 'fac-abc-001'}/intake`)}
      />
    );
  }

  const highSeverityCount = leakPoints.filter((lp) => lp.severity === 'high').length;
  const mediumSeverityCount = leakPoints.filter((lp) => lp.severity === 'medium').length;

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-rose-50 text-rose-700 border border-rose-200 font-mono">
              Diagnostic Core
            </span>
            <span className="text-xs text-gray-400 font-mono">Assessment: {assessmentId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            Emission Leak-Point Ranking & Severity Matrix
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Ranked by contribution percentage to plant-wide greenhouse gas footprint.
          </p>
        </div>

        {/* Severity counts pill */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {highSeverityCount} High (≥30%)
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {mediumSeverityCount} Medium (10-30%)
          </span>
        </div>
      </div>

      {/* Full-Width Ranked Horizontal Bar Chart Card */}
      <div className="panel-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Relative Contribution Breakdown (% of Total CO₂e)</h3>
            <p className="text-xs text-gray-500">
              Click any bar to drill down into targeted circular interventions.
            </p>
          </div>
          <span className="text-xs text-gray-400 font-mono">Thresholds: High ≥30% | Medium 10–30% | Low &lt;10%</span>
        </div>

        <RankedBarChart
          data={leakPoints}
          onSelectLeakPoint={handleSelectLeakPoint}
          height={280}
        />
      </div>

      {/* Filter and Cards Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Ranked Leak-Point Profiles ({filteredLeakPoints.length})</h3>
          <p className="text-xs text-gray-500">Drill down into operational root causes and intervention options.</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          {['all', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all duration-150 ${
                severityFilter === sev
                  ? 'bg-[#5546E8] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Ranked Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLeakPoints.map((lp) => {
          const isHigh = lp.severity === 'high';
          const isMedium = lp.severity === 'medium';

          return (
            <div
              key={lp.leak_point_ref}
              className={`panel-card p-5 flex flex-col justify-between transition-all hover:shadow-card-hover ${
                isHigh ? 'border-rose-200 bg-rose-50/10' : isMedium ? 'border-amber-200 bg-amber-50/10' : ''
              }`}
            >
              <div>
                {/* Header: Rank + Severity Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 text-gray-800 font-mono font-bold flex items-center justify-center text-xs shadow-xs">
                      #{lp.rank}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        isHigh
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : isMedium
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {lp.severity} Severity
                    </span>
                  </div>

                  <span className="text-xs uppercase font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                    {lp.category}
                  </span>
                </div>

                {/* Leak Point Name */}
                <h4 className="text-base font-bold text-gray-900 mb-2">{lp.name}</h4>

                {/* Metrics Box */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 grid grid-cols-2 gap-2 text-xs mb-4">
                  <div>
                    <span className="text-gray-400 text-[11px]">CO₂e Footprint:</span>
                    <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">
                      {lp.co2e} <span className="text-xs font-normal text-gray-500">t CO₂e</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px]">Contribution Share:</span>
                    <p className="font-mono font-bold text-[#5546E8] text-sm mt-0.5">
                      {Math.round(lp.pct_contribution * 100)}%
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Primary process stage: <strong className="text-gray-700">{lp.subtype.replace(/_/g, ' ')}</strong>. Identified as an operational target for circular mitigation.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-gray-100 mt-4">
                <button
                  onClick={() => handleSelectLeakPoint(lp.leak_point_ref)}
                  className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <span>View Possible Interventions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
