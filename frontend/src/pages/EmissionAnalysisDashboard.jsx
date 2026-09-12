import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Zap,
  Box,
  Recycle,
  Info,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import { useAssessmentSummary } from '../hooks/useAssessmentSummary';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';
import { assessmentsApi } from '../api/assessments';
import AnimatedCounter from '../components/AnimatedCounter';

export default function EmissionAnalysisDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeAssessment, activeFacility, addToast } = useFacilityAssessment();

  const assessmentId = id || activeAssessment?.id || 'asm-abc-001';
  const { data: summary, loading, error, refetch } = useAssessmentSummary(assessmentId);

  const handleExportCSV = async () => {
    try {
      await assessmentsApi.exportReport(assessmentId, 'csv');
      addToast('Auditable emissions CSV exported successfully!');
    } catch (e) {
      addToast('Export failed: ' + (e.message || 'Unknown error'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="kpi" count={3} />
        <LoadingSkeleton variant="table" count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        title="Failed to Load Emission Analysis"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!summary || !summary.line_items || summary.line_items.length === 0) {
    return (
      <EmptyState
        title="No Line-Item Calculations Available"
        description="Run an assessment intake to generate verifiable carbon activity line items."
        actionLabel="Go to Intake Wizard"
        onAction={() => navigate(`/facility/${activeFacility?.id || 'fac-abc-001'}/intake`)}
      />
    );
  }

  const columns = [
    {
      key: 'category',
      label: 'Process',
      sortable: true,
      render: (val) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
            val === 'energy'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : val === 'material'
              ? 'bg-indigo-50 text-[#5546E8] border border-indigo-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'subtype',
      label: 'Activity / Input',
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="text-gray-900 font-semibold capitalize">{val.replace(/_/g, ' ')}</p>
          {row.treatment && (
            <p className="text-[11px] text-gray-400 capitalize">Route: {row.treatment}</p>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      align: 'right',
      render: (val) => Number(val).toLocaleString(),
    },
    {
      key: 'unit',
      label: 'Unit',
      render: (val) => <span className="uppercase text-gray-500 font-mono">{val}</span>,
    },
    {
      key: 'emission_factor',
      label: 'Emission Factor',
      sortable: true,
      align: 'right',
      render: (val, row) => (
        <div>
          <span className="text-gray-900 font-mono font-medium">{val}</span>
          <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{row.factor_unit}</p>
        </div>
      ),
    },
    {
      key: 'co2e',
      label: 'Emissions (t CO₂e)',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono font-bold text-gray-900 text-xs">{val} t</span>
      ),
    },
    {
      key: 'pct_contribution',
      label: 'Contribution %',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-mono font-semibold text-[#5546E8]">
          {(val * 100).toFixed(1)}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-[#5546E8] border border-indigo-100 font-mono whitespace-nowrap">
              Auditable Log
            </span>
            <span className="text-xs text-gray-400 font-mono whitespace-nowrap">Assessment: {assessmentId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            Deterministic Emission Line Items & Audit Verification
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Transparent breakdown of every consumption line: quantity × factor = verified CO₂e.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 self-start sm:self-center"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#5546E8]" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Category Subtotal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel-card p-4 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Energy Subtotal</span>
            <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">
              <AnimatedCounter value={summary.category_totals?.energy || 0} /> <span className="text-xs font-normal text-gray-500">t CO₂e</span>
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Scope 1 & 2 (Fuels / Grid)</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="panel-card p-4 flex items-center justify-between border-l-4 border-l-[#5546E8]">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Materials Subtotal</span>
            <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">
              <AnimatedCounter value={summary.category_totals?.material || 0} /> <span className="text-xs font-normal text-gray-500">t CO₂e</span>
            </p>
            <p className="text-[11px] text-[#5546E8] mt-0.5 font-medium">Scope 3 (Purchased Polymers)</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-[#5546E8] border border-indigo-100">
            <Box className="w-5 h-5" />
          </div>
        </div>

        <div className="panel-card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Waste Subtotal</span>
            <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">
              <AnimatedCounter value={summary.category_totals?.waste || 0} /> <span className="text-xs font-normal text-gray-500">t CO₂e</span>
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Scope 3 (Disposal / Recycle)</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Recycle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Filterable Data Table */}
      <div className="space-y-2">
        <DataTable
          data={summary.line_items}
          columns={columns}
          searchPlaceholder="Search activity lines by name, factor, or category..."
          categoryFilterKey="category"
          categories={['all', 'energy', 'material', 'waste']}
          enableExpand={true}
        />
        <p className="text-[11px] text-gray-500 flex items-center gap-1.5 px-1 pt-1">
          <Info className="w-3.5 h-3.5 text-gray-400" />
          <span>
            Click on any line item's arrow icon to inspect its exact greenhouse gas protocol scope, source citation, and unit formula.
          </span>
        </p>
      </div>
    </div>
  );
}
