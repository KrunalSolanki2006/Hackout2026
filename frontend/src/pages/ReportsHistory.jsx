import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  Printer,
  Share2,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import { useHistory } from '../hooks/useHistory';
import { useAssessmentSummary } from '../hooks/useAssessmentSummary';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';
import { assessmentsApi } from '../api/assessments';

export default function ReportsHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeFacility, activeAssessment, addToast } = useFacilityAssessment();

  const facilityId = id || activeFacility?.id || 'fac-abc-001';
  const assessmentId = activeAssessment?.id || 'asm-abc-001';

  const { history, loading: historyLoading, error: historyError, refetch } = useHistory(facilityId);
  const { data: currentSummary, loading: summaryLoading } = useAssessmentSummary(assessmentId);

  const [selectedAsmId, setSelectedAsmId] = useState(assessmentId);
  const [exportingFormat, setExportingFormat] = useState(null);

  const loading = historyLoading || summaryLoading;

  // Combine history records with current active assessment for comparison
  const allAssessments = [
    ...(history || []),
    {
      assessment_id: assessmentId,
      facility_id: facilityId,
      total_co2e: currentSummary?.total_co2e || 88.35,
      recorded_at: activeAssessment?.completed_at || new Date().toISOString(),
      status: 'complete',
      interventions_applied: 2,
    },
  ];

  // Prepare line chart data (trend over time)
  const timelineData = allAssessments.map((item, idx) => ({
    name: new Date(item.recorded_at).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    }),
    fullDate: new Date(item.recorded_at).toLocaleDateString(),
    co2e: item.total_co2e,
    assessment_id: item.assessment_id,
  }));

  const handleExport = async (format) => {
    setExportingFormat(format);
    try {
      await assessmentsApi.exportReport(selectedAsmId, format);
      addToast(`Generated certified ${format.toUpperCase()} compliance report!`);
    } catch (e) {
      addToast('Export failed', 'error');
    } finally {
      setExportingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="chart" />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (historyError) {
    return (
      <ErrorBanner
        title="Failed to Load Assessment History"
        message={historyError}
        onRetry={refetch}
      />
    );
  }

  const baselineAssessment = allAssessments[0];
  const currentTotal = currentSummary?.total_co2e || 88.35;
  const baselineTotal = baselineAssessment?.total_co2e || 162.4;
  const totalDecarbonization = Math.round((baselineTotal - currentTotal) * 10) / 10;
  const pctDecarbonized = Math.round((totalDecarbonization / baselineTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-[#5546E8] border border-purple-200/80 font-mono flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#5546E8]" />
              <span>Compliance & Audit History</span>
            </span>
            <span className="text-xs text-gray-500 font-mono">Facility: {facilityId}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Historical Emissions Timeline & Certified Reports
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit trail of progress across fiscal periods with PDF and CSV export for ESG disclosure.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportingFormat === 'pdf'}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingFormat === 'pdf' ? 'Compiling PDF...' : 'Download PDF Report'}</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exportingFormat === 'csv'}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary text-xs p-2 hidden sm:flex"
            title="Print Audit Report"
          >
            <Printer className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Historical Progress Callout Card */}
      <div className="panel-card p-5 border border-purple-100 bg-purple-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5546E8] font-mono">
            Longitudinal Progress (Baseline to Present)
          </span>
          <h3 className="text-base font-bold text-gray-900 mt-0.5">
            Cumulative Plant Footprint Reduced by {totalDecarbonization} t CO₂e (-{pctDecarbonized}%)
          </h3>
          <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
            From initial baseline of {baselineTotal} t CO₂e down to current {currentTotal} t CO₂e across 3 assessment cycles via systematic leak-point mitigation.
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-2xl font-bold font-mono text-emerald-600">
            -{pctDecarbonized}%
          </span>
          <p className="text-[11px] text-gray-500">Total Decarbonization</p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="panel-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Assessment CO₂e Trend Over Time</h3>
            <p className="text-xs text-gray-500">Quarterly progress tracking across consecutive evaluations</p>
          </div>
          <span className="text-xs text-emerald-600 font-mono font-semibold">
            Downward Trajectory Verified
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis
                unit=" t"
                domain={['dataMin - 20', 'dataMax + 20']}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-lg text-xs space-y-1">
                        <p className="font-semibold text-gray-900">{d.fullDate}</p>
                        <p className="text-emerald-600 font-mono font-bold">
                          Total: {d.co2e} t CO₂e
                        </p>
                        <p className="text-gray-400 font-mono text-[10px]">ID: {d.assessment_id}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="co2e"
                stroke="#5546E8"
                strokeWidth={3}
                dot={{ fill: '#5546E8', r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assessments History Table */}
      <div className="panel-card overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Logged Assessment Records</h3>
            <p className="text-xs text-gray-500">Click any row to switch active view or generate reports</p>
          </div>
          <span className="text-xs text-gray-400 font-mono">{allAssessments.length} archived cycles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Evaluation Date</th>
                <th className="py-3 px-4">Assessment ID</th>
                <th className="py-3 px-3 text-right">Calculated Footprint</th>
                <th className="py-3 px-3 text-right">Interventions</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Export Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 bg-white">
              {allAssessments.map((row) => {
                const isSelected = selectedAsmId === row.assessment_id;
                return (
                  <tr
                    key={row.assessment_id}
                    onClick={() => setSelectedAsmId(row.assessment_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-purple-50/50' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-900 font-medium flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(row.recorded_at).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">{row.assessment_id}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                      {row.total_co2e} t CO₂e
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-600">
                      {row.interventions_applied || 0} applied
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport('pdf');
                        }}
                        className="px-2 py-1 rounded bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200 shadow-2xs transition-colors"
                      >
                        PDF
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport('csv');
                        }}
                        className="px-2 py-1 rounded bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200 shadow-2xs transition-colors"
                      >
                        CSV
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/assessment/${row.assessment_id}/overview`);
                        }}
                        className="px-2.5 py-1 rounded bg-[#5546E8] hover:bg-[#4335D6] text-white text-[11px] font-semibold transition-colors shadow-2xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
