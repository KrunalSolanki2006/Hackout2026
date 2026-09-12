import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Flame,
  AlertTriangle,
  TrendingDown,
  IndianRupee,
  ArrowRight,
  AlertOctagon,
  Lightbulb,
  ShieldCheck,
  FileSpreadsheet,
  FileUp,
  UploadCloud,
  PieChart as PieChartIcon,
  Zap,
  Box,
  Recycle,
  TrendingUp,
} from 'lucide-react';
import KpiCard from '../components/KpiCard';
import AnimatedCounter from '../components/AnimatedCounter';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import CsvActivityModal from '../components/CsvActivityModal';
import { useAssessmentSummary } from '../hooks/useAssessmentSummary';
import { useLeakPoints } from '../hooks/useLeakPoints';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';

const CATEGORY_COLORS = {
  energy: '#F59E0B', // Amber
  material: '#5546E8', // Primary Indigo
  waste: '#10B981', // Emerald
};

const getContributorIcon = (category, name) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('electric') || lower.includes('power') || lower.includes('grid')) return Zap;
  if (lower.includes('diesel') || lower.includes('fuel') || lower.includes('generator') || lower.includes('gas')) return Flame;
  if (lower.includes('waste') || lower.includes('scrap') || lower.includes('disposal')) return Recycle;
  if (lower.includes('plastic') || lower.includes('material') || lower.includes('polymer') || lower.includes('resin')) return Box;
  if (category === 'energy') return Zap;
  if (category === 'waste') return Recycle;
  return Box;
};

export default function OverviewDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeAssessment, activeFacility } = useFacilityAssessment();
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const assessmentId = id || activeAssessment?.id || 'asm-abc-001';
  const { data: summary, loading: summaryLoading, error: summaryError, refetch } =
    useAssessmentSummary(assessmentId);
  const { leakPoints, loading: lpLoading } = useLeakPoints(assessmentId);

  const loading = summaryLoading || lpLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="kpi" count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
        </div>
      </div>
    );
  }

  if (summaryError) {
    return (
      <ErrorBanner
        title="Failed to Load Overview Summary"
        message={summaryError}
        onRetry={refetch}
      />
    );
  }

  if (!summary || !summary.total_co2e) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No Completed Assessment Found"
          description="Run your first guided activity intake calculation or import an existing facility CSV to generate the executive carbon intelligence summary."
          actionLabel="Start Guided Intake"
          onAction={() => navigate(`/facility/${activeFacility?.id || 'fac-abc-001'}/intake`)}
        />
        <div className="text-center -mt-2">
          <span className="text-xs text-gray-400">or</span>
          <div className="mt-2">
            <button
              onClick={() => setCsvModalOpen(true)}
              className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-xs"
            >
              <FileUp className="w-3.5 h-3.5 text-[#5546E8]" />
              <span>Import Facility Activity CSV</span>
            </button>
          </div>
        </div>

        <CsvActivityModal
          isOpen={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          assessmentId={assessmentId}
          onImportSuccess={() => refetch()}
        />
      </div>
    );
  }

  // Prep category donut data
  const donutData = Object.entries(summary.category_totals || {}).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: val,
    key,
  }));

  const topLeak = leakPoints && leakPoints.length > 0 ? leakPoints[0] : null;
  const highSeverityCount = leakPoints.filter((lp) => lp.severity === 'high').length;
  const potentialReduction = Math.round(summary.total_co2e * 0.42 * 10) / 10;
  const estimatedCapex = '₹65,000 – ₹98,000';

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const pct = summary.total_co2e > 0 ? Math.round((data.value / summary.total_co2e) * 100) : 0;
      return (
        <div className="bg-white border border-gray-200 p-2.5 rounded-xl shadow-dropdown text-xs">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-gray-600 font-mono mt-0.5">{data.value} t CO₂e ({pct}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-[#5546E8] border border-indigo-100 font-mono">
              Executive Dashboard
            </span>
            <span className="text-xs text-gray-400 font-mono">ID: {assessmentId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            {activeFacility?.name || 'ABC Plastics'} — Carbon Footprint Summary
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Operational greenhouse gas emissions audit and high-impact mitigation benchmarks.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#5546E8] bg-indigo-50/80 border border-indigo-200/80 hover:bg-indigo-100 hover:border-indigo-300 shadow-2xs transition-all duration-150 whitespace-nowrap active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4 text-[#5546E8]" />
            <span>Import Activity CSV</span>
          </button>

          <Link
            to={`/facility/${activeFacility?.id || 'fac-abc-001'}/intake`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-2xs transition-all duration-150 whitespace-nowrap active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4 text-gray-500" />
            <span>Edit Activity Inputs</span>
          </Link>

          <Link
            to={`/assessment/${assessmentId}/leak-points`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-2xs transition-all duration-150 whitespace-nowrap active:scale-[0.98]"
          >
            <AlertOctagon className="w-4 h-4 text-amber-500" />
            <span>View Leak Points</span>
          </Link>

          <Link
            to={`/assessment/${assessmentId}/recommendations`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#5546E8] hover:bg-[#4335D6] shadow-sm hover:shadow transition-all duration-150 whitespace-nowrap active:scale-[0.98]"
          >
            <Lightbulb className="w-4 h-4 text-indigo-100" />
            <span>View Recommendations</span>
          </Link>
        </div>
      </div>

      {/* Row 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Operational CO₂e"
          value={summary.total_co2e}
          unit="t CO₂e"
          subtitle="Audit-verified baseline"
          icon={Flame}
          badgeColor="rose"
          trend={{ value: '8.4%', label: 'vs prior quarter', positive: true }}
        />
        <KpiCard
          title="Hotspots Identified"
          value={leakPoints.length}
          unit="Active Sites"
          subtitle="Ranked emission sources"
          icon={AlertTriangle}
          badge={`${highSeverityCount} High Severity`}
          badgeColor="amber"
        />
        <KpiCard
          title="Potential CO₂ Reduction"
          value={potentialReduction}
          unit="t CO₂e/yr"
          subtitle="Via circular alternatives"
          icon={TrendingDown}
          badge="-42% Potential"
          badgeColor="emerald"
        />
        <KpiCard
          title="Estimated Interventions Capex"
          value={estimatedCapex}
          subtitle="Payback ~22 months"
          icon={IndianRupee}
          badge="ROI ~26%"
          badgeColor="blue"
        />
      </div>

      {/* Row 2: Middle Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Split Donut */}
        <div className="panel-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5546E8] shrink-0">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Emissions by Process Category</h3>
                <p className="text-xs text-gray-500">Energy vs. Materials vs. Waste balance</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-gray-400">GHG Protocol Scopes</span>
          </div>

          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                >
                  {donutData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={CATEGORY_COLORS[entry.key] || '#9CA3AF'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Stat */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-bold font-mono text-gray-900">
                <AnimatedCounter value={summary.total_co2e} />
              </span>
              <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                t CO₂e Total
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 text-xs">
            {donutData.map((d) => (
              <div key={d.key} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[d.key] }}
                />
                <div className="truncate">
                  <p className="font-semibold text-gray-800">{d.name}</p>
                  <p className="text-[11px] text-gray-500 font-mono">{d.value} t</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contributors Ranked Summary */}
        <div className="panel-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Top Emission Contributors</h3>
                <p className="text-xs text-gray-500">Ranked by diagnostic contribution %</p>
              </div>
            </div>
            <Link
              to={`/assessment/${assessmentId}/leak-points`}
              className="text-xs text-[#5546E8] hover:text-[#4335D6] font-semibold flex items-center gap-1"
            >
              <span>Full Diagnostic</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 my-auto">
            {leakPoints.slice(0, 4).map((lp) => {
              const ContributorIcon = getContributorIcon(lp.category, lp.name);
              const themeStyle =
                lp.category === 'energy'
                  ? 'bg-amber-50 text-amber-600 border-amber-200/80'
                  : lp.category === 'waste'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                  : 'bg-indigo-50 text-[#5546E8] border-indigo-200/80';

              return (
                <div
                  key={lp.leak_point_ref}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between transition-colors hover:bg-gray-100/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-white border border-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold font-mono shadow-2xs">
                        {lp.rank}
                      </span>
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${themeStyle}`}>
                        <ContributorIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{lp.name}</p>
                      <p className="text-[11px] text-gray-500 capitalize">{lp.category} stream</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-gray-900">{lp.co2e} t CO₂e</p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-[11px] font-mono font-semibold text-[#5546E8]">
                        {Math.round(lp.pct_contribution * 100)}%
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full ${
                          lp.severity === 'high'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : lp.severity === 'medium'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {lp.severity}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Deterministic engine accuracy</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% verifiable factors
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Bottom "Top Emission Source Callout" Card */}
      {topLeak && (
        <div className="panel-card p-5 border-amber-200 bg-amber-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-800 shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono">
                Primary Diagnostic Finding
              </span>
              <h4 className="text-base font-bold text-gray-900 mt-0.5">
                Top Emission Hotspot: {topLeak.name} ({Math.round(topLeak.pct_contribution * 100)}% of Plant Total)
              </h4>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                {topLeak.name} generates {topLeak.co2e} t CO₂e. Adopting high-priority circular alternatives (such as Solar Hybridization, Biofuel Switching, or PCR feedstock) will yield immediate emissions reductions without interrupting plant capacity.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              to={`/assessment/${assessmentId}/recommendations?leak_point=${topLeak.leak_point_ref}`}
              className="btn-primary text-xs py-2 px-4 shadow-xs"
            >
              <span>View Targeted Interventions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* CSV Batch Activity Upload & Mapping Modal */}
      <CsvActivityModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        assessmentId={assessmentId}
        onImportSuccess={() => refetch()}
      />
    </div>
  );
}
