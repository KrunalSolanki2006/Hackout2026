import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Filter,
  Sliders,
  Sparkles,
  LayoutGrid,
  Table,
  CheckCircle2,
  Scale,
  X,
} from 'lucide-react';
import RecommendationCard from '../components/RecommendationCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import ExplanationChecklist from '../components/ExplanationChecklist';
import { useRecommendations } from '../hooks/useRecommendations';
import { useLeakPoints } from '../hooks/useLeakPoints';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';

export default function RecommendationDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeAssessment, activeFacility, addToast } = useFacilityAssessment();

  const assessmentId = id || activeAssessment?.id || 'asm-abc-001';

  const selectedLeakPoint = searchParams.get('leak_point') || 'all';
  const selectedCategory = searchParams.get('category') || 'all';

  const [viewMode, setViewMode] = useState('grid');
  const [compareIds, setCompareIds] = useState([]);
  const [detailModalItem, setDetailModalItem] = useState(null);

  const filterParams = useMemo(() => {
    const params = {};
    if (selectedLeakPoint !== 'all') params.leak_point = selectedLeakPoint;
    if (selectedCategory !== 'all') params.category = selectedCategory;
    return params;
  }, [selectedLeakPoint, selectedCategory]);

  const { recommendations, loading, error, refetch, apply, dismiss } =
    useRecommendations(assessmentId, filterParams);
  const { leakPoints } = useLeakPoints(assessmentId);

  const handleLeakPointFilter = (lp) => {
    const next = new URLSearchParams(searchParams);
    if (lp === 'all') next.delete('leak_point');
    else next.set('leak_point', lp);
    setSearchParams(next);
  };

  const handleCategoryFilter = (cat) => {
    const next = new URLSearchParams(searchParams);
    if (cat === 'all') next.delete('category');
    else next.set('category', cat);
    setSearchParams(next);
  };

  const toggleCompare = (recId) => {
    setCompareIds((prev) =>
      prev.includes(recId) ? prev.filter((id) => id !== recId) : [...prev, recId]
    );
  };

  const handleApply = async (recId) => {
    try {
      await apply(recId);
      addToast('Recommendation committed and added to Action Roadmap!');
    } catch (e) {
      addToast('Failed to apply recommendation', 'error');
    }
  };

  const handleDismiss = async (recId) => {
    try {
      await dismiss(recId);
      addToast('Recommendation dismissed', 'info');
    } catch (e) {
      addToast('Failed to dismiss', 'error');
    }
  };

  const handleSimulate = (recId) => {
    navigate(`/assessment/${assessmentId}/simulate?select=${recId}`);
  };

  const compareItems = recommendations.filter((r) => compareIds.includes(r.recommendation_id));
  const compareChartData = compareItems.map((r) => ({
    name: r.intervention?.name.slice(0, 18) + '...',
    fullName: r.intervention?.name,
    score: r.score,
    reduction: (r.estimated_co2_reduction_range[0] + r.estimated_co2_reduction_range[1]) / 2,
    cost: (r.estimated_cost_range[0] + r.estimated_cost_range[1]) / 2,
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="cards" count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        title="Failed to Load Recommendations"
        message={`${error}. Note: The system automatically falls back to rule-based scoring.`}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-[#5546E8] border border-indigo-100 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#5546E8]" />
              <span>Machine Learning & Circular Recommender</span>
            </span>
            <span className="text-xs text-gray-400 font-mono">Assessment: {assessmentId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            Ranked Circular Interventions for {activeFacility?.name || 'ABC Plastics'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Ranked by suitability score (0–100) with auditable explanation checklists.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center p-1 rounded-lg bg-white border border-gray-200 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-gray-100 text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table' ? 'bg-gray-100 text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          <Link
            to={`/assessment/${assessmentId}/simulate${
              compareIds.length > 0 ? `?select=${compareIds.join(',')}` : ''
            }`}
            className="btn-primary text-xs py-2 px-3"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Open What-If Simulator</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Leak point filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-500 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#5546E8]" />
              <span>Target Hotspot:</span>
            </span>
            <button
              onClick={() => handleLeakPointFilter('all')}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-all duration-150 ${
                selectedLeakPoint === 'all'
                  ? 'bg-[#5546E8] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Hotspots
            </button>
            {leakPoints.map((lp) => (
              <button
                key={lp.leak_point_ref}
                onClick={() => handleLeakPointFilter(lp.leak_point_ref)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-150 ${
                  selectedLeakPoint === lp.leak_point_ref
                    ? 'bg-[#5546E8] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {lp.name} ({Math.round(lp.pct_contribution * 100)}%)
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 font-medium">Category:</span>
            {['all', 'energy', 'materials', 'waste'].map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-all duration-150 ${
                  selectedCategory === cat
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compare Mode Drawer / Card */}
      {compareItems.length > 0 && (
        <div className="panel-card p-5 border-[#5546E8]/30 bg-indigo-50/20 shadow-card relative animate-slide-in">
          <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#5546E8]" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Side-by-Side Comparison ({compareItems.length} selected)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Compare suitability score vs. CO₂ reduction vs. capital investment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/assessment/${assessmentId}/simulate?select=${compareIds.join(',')}`}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Simulate Combined ({compareItems.length})</span>
              </Link>
              <button
                onClick={() => setCompareIds([])}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                title="Clear comparison selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fill: '#4B5563', fontSize: 11, fontWeight: 500 }} />
                <YAxis unit="/100" domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-dropdown text-xs space-y-1">
                          <p className="font-semibold text-gray-900">{d.fullName}</p>
                          <p className="text-[#5546E8] font-mono font-bold">Suitability Score: {d.score}/100</p>
                          <p className="text-gray-600 font-mono">Est. Reduction: ~{d.reduction} t CO₂e/yr</p>
                          <p className="text-gray-500 font-mono">Est. Capex: ~₹{d.cost.toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="score" fill="#5546E8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Recommendations View */}
      {recommendations.length === 0 ? (
        <EmptyState
          title="No Matching Interventions"
          description="Try resetting your hotspot or category filters to explore the full catalog."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchParams(new URLSearchParams());
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.recommendation_id}
              recommendation={rec}
              onApply={handleApply}
              onDismiss={handleDismiss}
              onSimulate={handleSimulate}
              onViewDetails={(item) => setDetailModalItem(item)}
              isSelectedForCompare={compareIds.includes(rec.recommendation_id)}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      ) : (
        /* Compact Table View */
        <div className="panel-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] text-gray-500 uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-4">Intervention</th>
                  <th className="py-3 px-3">Target Hotspot</th>
                  <th className="py-3 px-3 text-right">Score</th>
                  <th className="py-3 px-3 text-right">Est. Reduction</th>
                  <th className="py-3 px-3 text-right">Est. Cost</th>
                  <th className="py-3 px-3 text-right">Payback</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recommendations.map((rec) => (
                  <tr key={rec.recommendation_id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(rec.recommendation_id)}
                        onChange={() => toggleCompare(rec.recommendation_id)}
                        className="rounded border-gray-300 text-[#5546E8] focus:ring-[#5546E8] w-3.5 h-3.5"
                      />
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {rec.intervention?.name}
                      <p className="text-[10px] text-gray-400 capitalize">{rec.intervention?.category}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-600">{rec.applicable_leak_point}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#5546E8] text-sm">
                      {rec.score}/100
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-700">
                      {rec.estimated_co2_reduction_range[0]}–{rec.estimated_co2_reduction_range[1]} t/yr
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-700">
                      ₹{rec.estimated_cost_range[0].toLocaleString()} – ₹{rec.estimated_cost_range[1].toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700 font-semibold">
                      {rec.payback_period_months} mo
                    </td>
                    <td className="py-3 px-4 text-center space-x-1.5">
                      <button
                        onClick={() => setDetailModalItem(rec)}
                        className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleSimulate(rec.recommendation_id)}
                        className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-[#5546E8] hover:bg-indigo-100 text-[11px] font-semibold"
                      >
                        Simulate
                      </button>
                      {rec.status === 'applied' ? (
                        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">In Plan</span>
                      ) : (
                        <button
                          onClick={() => handleApply(rec.recommendation_id)}
                          className="px-2.5 py-1 rounded-md bg-[#5546E8] hover:bg-[#4335D6] text-white text-[11px] font-semibold"
                        >
                          Apply
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="panel-card max-w-xl w-full p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-[#5546E8] bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 font-semibold">
                  {detailModalItem.score_source === 'ml' ? 'Machine Learning Ranker' : 'Rule-Based Scorer'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1.5">
                  {detailModalItem.intervention?.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {detailModalItem.intervention?.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 text-[11px]">Match Score:</span>
                <p className="font-mono font-bold text-[#5546E8] text-sm mt-0.5">
                  {detailModalItem.score}/100
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-[11px]">CO₂ Reduction:</span>
                <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">
                  {detailModalItem.estimated_co2_reduction_range[0]}–{detailModalItem.estimated_co2_reduction_range[1]} t
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-[11px]">Capex:</span>
                <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">
                  ₹{detailModalItem.estimated_cost_range[0].toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-[11px]">Payback:</span>
                <p className="font-mono font-bold text-amber-700 text-sm mt-0.5">
                  {detailModalItem.payback_period_months} mo
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Audit Checklist & Model Rationale:
              </h4>
              <ExplanationChecklist explanations={detailModalItem.explanation} />
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => handleSimulate(detailModalItem.recommendation_id)}
                className="btn-secondary text-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Test in Simulator</span>
              </button>

              <button
                onClick={() => {
                  handleApply(detailModalItem.recommendation_id);
                  setDetailModalItem(null);
                }}
                className="btn-primary text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Commit to Action Roadmap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
