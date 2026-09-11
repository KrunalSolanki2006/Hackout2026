import React from 'react';
import {
  TrendingUp,
  Clock,
  IndianRupee,
  Leaf,
  Layers,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import ExplanationChecklist from './ExplanationChecklist';

export default function RecommendationCard({
  recommendation,
  onApply,
  onDismiss,
  onSimulate,
  onViewDetails,
  isSelectedForCompare = false,
  onToggleCompare,
}) {
  const {
    recommendation_id,
    intervention,
    score,
    score_source,
    estimated_cost_range,
    currency = 'INR',
    estimated_co2_reduction_range,
    co2_reduction_unit = 't CO2e/year',
    payback_period_months,
    roi_pct,
    implementation_difficulty,
    explanation = [],
    applicable_leak_point,
    status = 'suggested',
  } = recommendation;

  const difficultyColors = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-800 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const formatCurrency = (val) => {
    return '₹' + Number(val || 0).toLocaleString();
  };

  return (
    <div
      className={`panel-card p-5 flex flex-col justify-between transition-all duration-200 ${
        status === 'applied'
          ? 'border-emerald-300 bg-emerald-50/20'
          : status === 'dismissed'
          ? 'opacity-60 bg-gray-50 border-gray-200'
          : 'hover:shadow-card-hover'
      }`}
    >
      <div>
        {/* Top bar: badges & score */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Compare checkbox */}
            {onToggleCompare && (
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer mr-1 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={isSelectedForCompare}
                  onChange={() => onToggleCompare(recommendation_id)}
                  className="rounded border-gray-300 text-[#5546E8] focus:ring-[#5546E8] w-3 h-3"
                />
                <span className="font-medium">Compare</span>
              </label>
            )}

            {/* Difficulty Badge */}
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border uppercase tracking-wider ${
                difficultyColors[implementation_difficulty] || difficultyColors.medium
              }`}
            >
              {implementation_difficulty}
            </span>

            {/* Score Source Badge */}
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium text-[#5546E8] bg-indigo-50 border border-indigo-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#5546E8]" />
              <span>{score_source === 'ml' ? 'ML Ranker' : 'Rule-based'}</span>
            </span>

            {/* Leak point reference tag */}
            <span className="px-2 py-0.5 rounded-md text-[11px] text-gray-600 bg-gray-100 border border-gray-200 font-mono">
              {applicable_leak_point}
            </span>
          </div>

          {/* Recommendation Score Pill */}
          <div className="text-right shrink-0">
            <div className="flex items-baseline justify-end gap-0.5">
              <span className="text-2xl font-bold font-mono text-[#5546E8]">{score}</span>
              <span className="text-xs text-gray-400 font-semibold">/100</span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              Match Score
            </p>
          </div>
        </div>

        {/* Title and Category */}
        <div className="mb-4">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
            {intervention?.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {intervention?.description}
          </p>
        </div>

        {/* 4 Financial & Carbon Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-gray-50/80 border border-gray-200/80 mb-4">
          <div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>CO₂ Reduction</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-900 font-mono mt-0.5">
              {estimated_co2_reduction_range[0]} – {estimated_co2_reduction_range[1]}{' '}
              <span className="text-[10px] text-gray-500 font-normal">t/yr</span>
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <IndianRupee className="w-3.5 h-3.5 text-[#5546E8]" />
              <span>Est. Investment</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-900 font-mono mt-0.5">
              {formatCurrency(estimated_cost_range[0])} – {formatCurrency(estimated_cost_range[1])}
            </p>
          </div>

          <div className="pt-2 border-t border-gray-200/60">
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Payback Period</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-900 font-mono mt-0.5">
              {payback_period_months} months
            </p>
          </div>

          <div className="pt-2 border-t border-gray-200/60">
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              <span>Expected ROI</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#5546E8] font-mono mt-0.5">
              +{roi_pct}%
            </p>
          </div>
        </div>

        {/* Explainability Checklist */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Why this intervention was recommended:
          </p>
          <ExplanationChecklist explanations={explanation} />
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(recommendation)}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 py-1.5 px-2.5 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>
          )}

          {onSimulate && (
            <button
              onClick={() => onSimulate(recommendation_id)}
              className="text-xs text-[#5546E8] hover:text-[#4335D6] flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-[#5546E8]/5 hover:bg-[#5546E8]/10 border border-[#5546E8]/20 transition-colors font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulate</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {status === 'applied' ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>In Roadmap</span>
            </span>
          ) : (
            <>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(recommendation_id)}
                  className="text-xs text-gray-400 hover:text-gray-600 py-1.5 px-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  title="Dismiss recommendation"
                >
                  Dismiss
                </button>
              )}
              {onApply && (
                <button
                  onClick={() => onApply(recommendation_id)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Apply to Roadmap
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
