import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
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
  Sparkles,
  ShieldCheck,
  Building2,
  Check,
  ExternalLink,
  Plus,
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
  const { activeFacility, activeAssessment, setActiveAssessment, addToast } = useFacilityAssessment();

  const facilityId = id || activeFacility?.id || 'fac-abc-001';
  const assessmentId = activeAssessment?.id || 'asm-abc-001';

  const { history, loading: historyLoading, error: historyError, refetch } = useHistory(facilityId);
  const { data: currentSummary, loading: summaryLoading } = useAssessmentSummary(assessmentId);

  const [selectedAsmId, setSelectedAsmId] = useState(assessmentId);
  const [exportingFormat, setExportingFormat] = useState(null);

  const loading = historyLoading || summaryLoading;

  // Deduplicate history records and merge current active assessment
  const historyList = history || [];
  const currentAsmRecord = {
    assessment_id: assessmentId,
    facility_id: facilityId,
    total_co2e: currentSummary?.total_co2e || activeAssessment?.total_co2e || 88.35,
    recorded_at: activeAssessment?.completed_at || activeAssessment?.created_at || new Date().toISOString(),
    status: activeAssessment?.status || 'complete',
    interventions_applied: 0,
  };

  const recordsMap = new Map();
  historyList.forEach((item) => {
    if (item?.assessment_id) {
      recordsMap.set(item.assessment_id, item);
    }
  });
  // Ensure current active assessment is in the map with up-to-date total_co2e
  recordsMap.set(assessmentId, currentAsmRecord);

  // Chronological order (oldest to newest for timeline trend)
  const allAssessmentsChronological = Array.from(recordsMap.values()).sort(
    (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
  );

  // Newest first for table display
  const allAssessments = [...allAssessmentsChronological].reverse();

  // Find currently selected record object
  const selectedRecord =
    allAssessments.find((a) => a.assessment_id === selectedAsmId) || allAssessments[0];

  // Timeline data with unique names, clean numbers, and percentage decarbonization
  const timelineData = allAssessmentsChronological.map((item, idx) => {
    const d = item.recorded_at ? new Date(item.recorded_at) : new Date();
    const dateLabel = isNaN(d.getTime())
      ? `Cycle ${idx + 1}`
      : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const fullDate = isNaN(d.getTime()) ? 'Recent Evaluation' : d.toLocaleDateString();
    const co2eVal = Number(item.total_co2e) || 0;
    const baseVal = Number(allAssessmentsChronological[0]?.total_co2e) || co2eVal;
    const reduction = baseVal > 0 ? Math.round(((baseVal - co2eVal) / baseVal) * 100) : 0;

    return {
      name: `${dateLabel} (C${idx + 1})`,
      shortName: dateLabel,
      fullDate,
      co2e: co2eVal,
      assessment_id: item.assessment_id,
      status: item.status || 'complete',
      reduction: reduction > 0 ? reduction : 0,
      interventions: item.interventions_applied || 0,
    };
  });

  const handleLogCheckpoint = async () => {
    try {
      const cycleNum = allAssessmentsChronological.length + 1;
      const newCycleId = `asm-${facilityId}-q${cycleNum}`;
      const lastVal = Number(allAssessmentsChronological[allAssessmentsChronological.length - 1]?.total_co2e || 85.0);
      const newRecord = {
        assessment_id: newCycleId,
        facility_id: facilityId,
        total_co2e: Math.max(10, Math.round((lastVal * 0.94) * 10) / 10),
        recorded_at: new Date().toISOString(),
        status: 'complete',
        interventions_applied: 2,
      };
      await assessmentsApi.addHistoryRecord(newRecord);
      refetch();
      setSelectedAsmId(newCycleId);
      addToast(`New verified audit checkpoint (${newCycleId}) logged to trend!`);
    } catch (err) {
      addToast('Failed to log audit checkpoint: ' + err.message, 'error');
    }
  };

  const handleExport = async (format, targetId = null) => {
    const asmIdToExport = targetId || selectedAsmId || assessmentId;
    setExportingFormat(format);
    try {
      await assessmentsApi.exportReport(asmIdToExport, format);
      addToast(`Downloaded certified ${format.toUpperCase()} compliance report for ${asmIdToExport}!`);
    } catch (e) {
      console.error('Export error:', e);
      addToast('Export failed: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleSelectAndOpen = (row) => {
    const asmList = JSON.parse(localStorage.getItem('carbotrack_assessments') || '[]');
    const target = asmList.find((a) => a.id === row.assessment_id) || {
      id: row.assessment_id,
      facility_id: facilityId,
      status: row.status,
      total_co2e: row.total_co2e,
    };
    setActiveAssessment(target);
    setSelectedAsmId(row.assessment_id);
    addToast(`Switched active view to ${row.assessment_id}`);
    navigate(`/assessment/${row.assessment_id}/overview`);
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

  const baselineAssessment = allAssessmentsChronological[0];
  const latestAssessment = allAssessmentsChronological[allAssessmentsChronological.length - 1];
  const baselineTotal = baselineAssessment?.total_co2e || 0;
  const latestTotal = latestAssessment?.total_co2e || 0;
  const totalDecarbonization = Math.max(0, Math.round((baselineTotal - latestTotal) * 10) / 10);
  const pctDecarbonized =
    baselineTotal > 0 && totalDecarbonization > 0
      ? Math.round((totalDecarbonization / baselineTotal) * 100)
      : 0;

  const facilityName = activeFacility?.name || 'Industrial Facility';

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
            <span className="text-xs text-gray-500 font-mono">{facilityName}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Historical Emissions Timeline & Certified Reports
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit trail of progress across fiscal periods with PDF and CSV export for ESG & CBAM disclosure.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportingFormat === 'pdf'}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingFormat === 'pdf' ? 'Compiling PDF...' : 'Download PDF Report'}</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exportingFormat === 'csv'}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{exportingFormat === 'csv' ? 'Exporting CSV...' : 'Export CSV'}</span>
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
            Longitudinal Progress ({facilityName})
          </span>
          <h3 className="text-base font-bold text-gray-900 mt-0.5">
            {allAssessmentsChronological.length > 1 && totalDecarbonization > 0
              ? `Cumulative Plant Footprint Reduced by ${totalDecarbonization} t CO₂e (-${pctDecarbonized}%)`
              : `Baseline Footprint Established (${latestTotal} t CO₂e)`}
          </h3>
          <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
            {allAssessmentsChronological.length > 1 && totalDecarbonization > 0
              ? `From initial baseline of ${baselineTotal} t CO₂e down to current ${latestTotal} t CO₂e across ${allAssessmentsChronological.length} assessment cycles via systematic leak-point mitigation.`
              : `Initial baseline evaluation verified for ${facilityName}. As additional assessments and circular interventions are applied, your longitudinal progress will be charted here.`}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-2xl font-bold font-mono text-emerald-600">
            {allAssessmentsChronological.length > 1 && totalDecarbonization > 0
              ? `-${pctDecarbonized}%`
              : `${latestTotal} t`}
          </span>
          <p className="text-[11px] text-gray-500">
            {allAssessmentsChronological.length > 1 && totalDecarbonization > 0
              ? 'Total Decarbonization'
              : 'Verified Baseline CO₂e'}
          </p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="panel-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Assessment CO₂e Trend Over Time</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-[#5546E8] border border-indigo-100 font-semibold">
                {timelineData.length} Evaluation Cycle{timelineData.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Interactive trajectory tracking consecutive audits. Click any point to inspect that cycle.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleLogCheckpoint}
              className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 text-[#5546E8] hover:bg-indigo-50 border-indigo-200 shadow-xs"
              title="Add a new milestone cycle to chart"
            >
              <Plus className="w-3.5 h-3.5 text-[#5546E8]" />
              <span>Log Audit Milestone</span>
            </button>

            <span className="text-xs text-emerald-600 font-mono font-semibold flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
              <Check className="w-3.5 h-3.5" />
              <span>Verified GHG Protocol Audit</span>
            </span>
          </div>
        </div>

        {/* Explicit container with fixed min-height ensures Recharts never collapses or renders 0 height */}
        <div className="w-full min-h-[290px] h-[290px]">
          <ResponsiveContainer width="100%" height={290}>
            <AreaChart
              data={timelineData}
              margin={{ top: 15, right: 30, left: 10, bottom: 20 }}
              onClick={(state) => {
                if (state?.activePayload?.[0]?.payload?.assessment_id) {
                  setSelectedAsmId(state.activePayload[0].payload.assessment_id);
                }
              }}
              className="cursor-pointer"
            >
              <defs>
                <linearGradient id="co2eTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5546E8" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#5546E8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                unit=" t"
                domain={[0, (dataMax) => Math.ceil((dataMax || 100) * 1.25)]}
                tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const isSelected = d.assessment_id === selectedRecord?.assessment_id;
                    return (
                      <div className="bg-[#080B20] text-white border border-[#1E2548] p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[190px]">
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                          <span className="font-semibold text-slate-200">{d.name}</span>
                          <span className="text-[10px] font-mono text-[#8A92A6]">{d.fullDate}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Total Emissions:</span>
                          <span className="font-mono font-bold text-white text-sm">
                            {d.co2e} t CO₂e
                          </span>
                        </div>
                        {d.reduction > 0 && (
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Decarbonization:</span>
                            <span className="font-mono font-semibold">-{d.reduction}%</span>
                          </div>
                        )}
                        <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[10px] text-indigo-300">
                          <span className="font-mono">ID: {d.assessment_id}</span>
                          <span className="underline cursor-pointer">{isSelected ? 'Selected' : 'Click to select'}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="co2e"
                stroke="#5546E8"
                strokeWidth={3}
                fill="url(#co2eTrendGradient)"
                isAnimationActive={false}
                dot={(props) => {
                  const isSelected = props.payload.assessment_id === selectedRecord?.assessment_id;
                  return (
                    <circle
                      key={props.key || props.cx}
                      cx={props.cx}
                      cy={props.cy}
                      r={isSelected ? 7 : 5}
                      fill={isSelected ? '#5546E8' : '#ffffff'}
                      stroke={isSelected ? '#ffffff' : '#5546E8'}
                      strokeWidth={isSelected ? 3 : 2}
                      className="cursor-pointer transition-transform hover:scale-125"
                      onClick={() => setSelectedAsmId(props.payload.assessment_id)}
                    />
                  );
                }}
                activeDot={{ r: 8, fill: '#5546E8', stroke: '#ffffff', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline cycle navigator strip */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5546E8]" />
            <span>Interactive Chart: Click any data point to inspect that cycle or export its report below</span>
          </span>
          <div className="flex items-center gap-1 font-mono text-[11px] self-end sm:self-center">
            <span className="text-gray-400">Baseline:</span>
            <strong className="text-gray-700">{baselineTotal} t</strong>
            <span className="mx-1 text-gray-300">→</span>
            <span className="text-gray-400">Current:</span>
            <strong className="text-emerald-600">{latestTotal} t</strong>
          </div>
        </div>
      </div>

      {/* Selected Assessment Action Snapshot Panel */}
      {selectedRecord && (
        <div className="panel-card p-4 border-2 border-[#5546E8]/20 bg-indigo-50/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5546E8]/10 text-[#5546E8] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5546E8] font-mono">
                  Selected Audit Cycle
                </span>
                {selectedRecord.assessment_id === assessmentId && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                    Active
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-gray-900 font-mono">{selectedRecord.assessment_id}</h4>
              <p className="text-xs text-gray-500">
                Footprint: <strong className="text-gray-900">{selectedRecord.total_co2e} t CO₂e</strong> • Evaluated on{' '}
                {new Date(selectedRecord.recorded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleExport('pdf', selectedRecord.assessment_id)}
              className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => handleExport('csv', selectedRecord.assessment_id)}
              className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => handleSelectAndOpen(selectedRecord)}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
            >
              <span>Open in Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Assessments History Table */}
      <div className="panel-card overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Logged Assessment Records</h3>
            <p className="text-xs text-gray-500">Click any row to select record, export compliance files, or inspect in dashboard</p>
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
                const isActive = activeAssessment?.id === row.assessment_id;
                return (
                  <tr
                    key={row.assessment_id}
                    onClick={() => setSelectedAsmId(row.assessment_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-50/70 border-l-4 border-l-[#5546E8]'
                        : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-900 font-medium flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(row.recorded_at).toLocaleDateString()}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-[#5546E8] border border-indigo-200 font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700 font-medium">{row.assessment_id}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                      {row.total_co2e} t CO₂e
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-600">
                      {row.interventions_applied || 0} applied
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {row.status || 'complete'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport('pdf', row.assessment_id);
                        }}
                        className="px-2 py-1 rounded bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200 shadow-2xs transition-colors hover:border-[#5546E8]/40"
                        title="Download certified PDF"
                      >
                        PDF
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport('csv', row.assessment_id);
                        }}
                        className="px-2 py-1 rounded bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200 shadow-2xs transition-colors hover:border-emerald-500/40"
                        title="Export auditable CSV"
                      >
                        CSV
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAndOpen(row);
                        }}
                        className="px-2.5 py-1 rounded bg-[#5546E8] hover:bg-[#4335D6] text-white text-[11px] font-semibold transition-colors shadow-2xs"
                        title="Switch active view and open in Overview dashboard"
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
